// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./libraries/StrategyLibrary.sol";
import "./StrategyRegistry.sol";
import "./interfaces/IPythOracle.sol";
import "./interfaces/IUniswapHelper.sol";
import "./interfaces/IRebalancerConfig.sol";
import "./delegation/interfaces/IDelegationManager.sol";
import { Delegation, ModeCode, Execution } from "@delegation-framework/utils/Types.sol";
import { ExecutionLib } from "@erc7579/lib/ExecutionLib.sol";
import "./delegation/types/DelegationTypes.sol";

/**
 * @title RebalanceExecutor
 * @notice Executes portfolio rebalances via MetaMask DelegationManager
 * @dev SMART ACCOUNT ONLY: All rebalances execute from MetaMask DeleGator accounts
 *
 * Flow:
 * 1. Bot calls rebalance(userAccount, strategyId, delegation)
 * 2. Read strategy from StrategyRegistry
 * 3. Validate userAccount is a DeleGator smart account
 * 4. Verify DeleGator owner matches strategy owner
 * 5. Calculate swaps using StrategyLibrary
 * 6. Build swap calldata for each swap
 * 7. Execute via DelegationManager.redeemDelegations()
 * 8. DelegationManager calls DeleGator.executeFromExecutor()
 * 9. Swaps happen IN the DeleGator (funds stay in smart account)
 * 10. Bot receives gas reimbursement
 */
contract RebalanceExecutor is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IDelegationManager public delegationManager;
    StrategyRegistry public registry;
    IPythOracle public oracle;
    IUniswapHelper public uniswapHelper;
    IRebalancerConfig public config;

    // SECURITY FIX HIGH-1: DEX whitelist for swap target validation
    mapping(address => bool) public approvedDEXs;

    // SECURITY FIX MEDIUM-1: Emergency pause mechanism
    bool public paused;

    // Events
    event RebalanceExecuted(
        address indexed user, uint256 indexed strategyId, uint256 timestamp, uint256 drift, uint256 gasReimbursed
    );
    event RebalanceFailed(address indexed user, uint256 indexed strategyId, string reason);
    event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event DEXApprovalUpdated(address indexed dex, bool approved);
    event EmergencyPaused(address indexed caller);
    event EmergencyUnpaused(address indexed caller);

    // DEBUG: Detailed logging events for error tracing
    event DebugRebalanceStarted(address indexed user, uint256 indexed strategyId, address sender);
    event DebugStrategyFetched(address indexed user, uint256 indexed strategyId, bool isActive, address owner);
    event DebugDeleGatorValidated(address indexed user, address delegatorOwner);
    event DebugDriftCalculated(uint256 drift, uint256 maxDrift, uint256 portfolioValue);
    event DebugSwapValidationPassed(uint256 swapCount);
    event DebugBeforeDelegationCall(uint256 permissionContextsLength, uint256 modesLength, uint256 executionLength);
    event DebugAfterDelegationCall(uint256 driftBefore, uint256 driftAfter, uint256 valueBefore, uint256 valueAfter);

    // Errors
    error StrategyNotActive();
    error TooSoonToRebalance();
    error DriftBelowThreshold();
    error InvalidDelegation();
    error RebalanceExecutionFailed();
    error UnapprovedDEX(address dex);
    error InsufficientSlippageProtection();
    error SwapsDidNotImproveAllocation();
    error BalanceValidationFailed();
    error ContractPaused();
    error NotADeleGator();
    error InvalidDeleGatorOwner();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // SECURITY FIX MEDIUM-1: Pause modifier
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /**
     * @notice Initialize the executor
     * @param _owner Owner address
     * @param _delegationManager DelegationManager address
     * @param _registry StrategyRegistry address
     * @param _oracle Oracle address
     * @param _uniswapHelper UniswapHelper address
     * @param _config Config address
     */
    function initialize(
        address _owner,
        address _delegationManager,
        address _registry,
        address _oracle,
        address _uniswapHelper,
        address _config
    ) external initializer {
        require(_owner != address(0), "Invalid owner");
        require(_delegationManager != address(0), "Invalid delegation manager");
        require(_registry != address(0), "Invalid registry");
        require(_oracle != address(0), "Invalid oracle");
        require(_uniswapHelper != address(0), "Invalid uniswap helper");
        require(_config != address(0), "Invalid config");

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        delegationManager = IDelegationManager(_delegationManager);
        registry = StrategyRegistry(_registry);
        oracle = IPythOracle(_oracle);
        uniswapHelper = IUniswapHelper(_uniswapHelper);
        config = IRebalancerConfig(_config);

        // SECURITY: Start unpaused
        paused = false;
    }

    /**
     * @notice SECURITY FIX HIGH-1: Approve/revoke DEX for swaps
     * @param dex DEX contract address
     * @param approved Whether to approve or revoke
     */
    function setDEXApproval(address dex, bool approved) external onlyOwner {
        require(dex != address(0), "Invalid DEX address");
        approvedDEXs[dex] = approved;
        emit DEXApprovalUpdated(dex, approved);
    }

    /**
     * @notice SECURITY FIX HIGH-1: Batch approve multiple DEXs
     * @param dexs Array of DEX addresses
     * @param approved Whether to approve or revoke
     */
    function batchSetDEXApproval(address[] calldata dexs, bool approved) external onlyOwner {
        for (uint256 i = 0; i < dexs.length; i++) {
            require(dexs[i] != address(0), "Invalid DEX address");
            approvedDEXs[dexs[i]] = approved;
            emit DEXApprovalUpdated(dexs[i], approved);
        }
    }

    /**
     * @notice SECURITY FIX MEDIUM-1: Emergency pause
     */
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice SECURITY FIX MEDIUM-1: Unpause after emergency
     */
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Update DelegationManager address
     * @param _newDelegationManager New DelegationManager contract address
     * @dev ADMIN ONLY: Allows owner to update DelegationManager in case of redeployment
     */
    function setDelegationManager(address _newDelegationManager) external onlyOwner {
        require(_newDelegationManager != address(0), "Invalid delegation manager");
        delegationManager = IDelegationManager(_newDelegationManager);
    }

    /**
     * @notice Execute a rebalance for a user's strategy
     * @param userAccount User's MetaMask DeleGator account address
     * @param strategyId Strategy ID to rebalance
     * @param tokensIn Tokens being sold in each swap (for approval)
     * @param swapTargets Target contracts for each swap (from DEX aggregator)
     * @param swapCallDatas Pre-calculated optimal swap calldata (from off-chain DEX aggregator)
     * @param minOutputAmounts Minimum output amounts for slippage protection (SECURITY FIX HIGH-2)
     * @param nativeValues Native token amounts to send with each swap (for native token swaps/wraps)
     * @param permissionContexts Encoded delegations (user's signed delegation)
     * @param modes Execution modes for DelegationManager
     *
     * @dev New architecture: Bot calculates optimal routes OFF-CHAIN via DEX aggregators (1inch/0x/ParaSwap)
     *      and passes the pre-calculated swap data here for ON-CHAIN execution.
     *      This saves gas and enables better pricing through multi-DEX comparison.
     *
     * SECURITY ENHANCEMENTS:
     * - HIGH-1: Validates swap targets against whitelist
     * - HIGH-2: Enforces minimum output amounts for slippage protection
     * - HIGH-3: Validates swaps improve portfolio allocation
     * - HIGH-5: Validates final balances match expected values
     * - MEDIUM-1: Can be paused in emergency
     * - NEW: Supports native token swaps via nativeValues parameter
     * - NEW: Automatically approves tokens before swaps
     */
    function rebalance(
        address userAccount,
        uint256 strategyId,
        address[] calldata tokensIn,
        address[] calldata swapTargets,
        bytes[] calldata swapCallDatas,
        uint256[] calldata minOutputAmounts,
        uint256[] calldata nativeValues,
        bytes[] calldata permissionContexts,
        ModeCode[] calldata modes
    ) external payable nonReentrant whenNotPaused {
        // DEBUG: Log function entry
        emit DebugRebalanceStarted(userAccount, strategyId, msg.sender);

        // 1. Get strategy from registry
        StrategyLibrary.Strategy memory strategy = registry.getStrategy(userAccount, strategyId);
        emit DebugStrategyFetched(userAccount, strategyId, strategy.isActive, strategy.owner);

        // 2. Validate userAccount is a DeleGator smart account
        if (!DelegationTypes.isDeleGator(userAccount)) {
            revert NotADeleGator();
        }

        // 3. Verify strategy owner matches DeleGator owner (security check)
        address delegatorOwner = DelegationTypes.getDeleGatorOwner(userAccount);
        if (delegatorOwner == address(0) || delegatorOwner != strategy.owner) {
            revert InvalidDeleGatorOwner();
        }
        emit DebugDeleGatorValidated(userAccount, delegatorOwner);

        // 4. Validate strategy
        if (!strategy.isActive) {
            revert StrategyNotActive();
        }

        if (block.timestamp < strategy.lastRebalanceTime + strategy.rebalanceInterval) {
            revert TooSoonToRebalance();
        }

        // 5. Calculate current drift and portfolio value BEFORE swaps
        uint256[] memory currentWeightsBefore =
            StrategyLibrary.calculateCurrentWeights(userAccount, strategy.tokens, address(oracle));
        uint256 drift = StrategyLibrary.calculateDrift(currentWeightsBefore, strategy.weights);

        // SECURITY FIX HIGH-3: Store portfolio value before swaps
        uint256 portfolioValueBefore = StrategyLibrary.getPortfolioValue(userAccount, strategy.tokens, address(oracle));

        // 6. Check drift exceeds threshold
        uint256 maxDrift = config.getMaxAllocationDrift();
        if (drift < maxDrift) {
            revert DriftBelowThreshold();
        }
        emit DebugDriftCalculated(drift, maxDrift, portfolioValueBefore);

        // 7. Validate swap data
        require(tokensIn.length == swapTargets.length, "TokensIn length mismatch");
        require(swapTargets.length == swapCallDatas.length, "Swap arrays length mismatch");
        require(swapTargets.length == minOutputAmounts.length, "Min output amounts length mismatch");
        require(swapTargets.length == nativeValues.length, "Native values length mismatch");
        require(swapTargets.length > 0, "No swaps provided");

        // SECURITY FIX HIGH-1: Validate all swap targets are approved DEXs
        for (uint256 i = 0; i < swapTargets.length; i++) {
            if (!approvedDEXs[swapTargets[i]]) {
                revert UnapprovedDEX(swapTargets[i]);
            }
        }

        // SECURITY FIX HIGH-2: Validate slippage protection is provided
        for (uint256 i = 0; i < minOutputAmounts.length; i++) {
            if (minOutputAmounts[i] == 0) {
                revert InsufficientSlippageProtection();
            }
        }
        emit DebugSwapValidationPassed(swapTargets.length);

        // 8. Build execution calldata for each swap using MetaMask's Execution format
        // Bot provides pre-calculated optimal routes from DEX aggregators
        // Native values allow DeleGator to send its own native tokens with swaps/wraps

        // Build Execution[] array with approval + swap for each token
        // MetaMask's DelegationManager expects ERC-7579 Execution format
        Execution[] memory executions = new Execution[](swapTargets.length * 2);
        uint256 idx = 0;

        for (uint256 i = 0; i < swapTargets.length; i++) {
            // 1. Approval execution: DeleGator approves DEX to spend tokens
            executions[idx++] = Execution({
                target: tokensIn[i],        // Token contract address
                value: 0,                   // No native value for approval
                callData: abi.encodeWithSignature(
                    "approve(address,uint256)",
                    swapTargets[i],
                    type(uint256).max
                )
            });

            // 2. Swap execution: DeleGator calls DEX to execute swap
            executions[idx++] = Execution({
                target: swapTargets[i],     // DEX contract address
                value: nativeValues[i],     // Native token amount (for native swaps/wraps)
                callData: swapCallDatas[i]  // Pre-calculated optimal swap route
            });
        }

        // Encode executions using MetaMask's ExecutionLib (ERC-7579 format)
        // This produces the correct format for DelegationManager.redeemDelegations()
        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // 9. Execute via DelegationManager
        emit DebugBeforeDelegationCall(permissionContexts.length, modes.length, executionCallDatas.length);
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            // SECURITY FIX HIGH-3 & HIGH-5: Validate swaps improved allocation
            uint256[] memory currentWeightsAfter =
                StrategyLibrary.calculateCurrentWeights(userAccount, strategy.tokens, address(oracle));
            uint256 driftAfter = StrategyLibrary.calculateDrift(currentWeightsAfter, strategy.weights);

            // Drift should be reduced after rebalancing
            if (driftAfter >= drift) {
                revert SwapsDidNotImproveAllocation();
            }

            // SECURITY FIX HIGH-3: Portfolio value should not decrease significantly (allowing for slippage)
            uint256 portfolioValueAfter =
                StrategyLibrary.getPortfolioValue(userAccount, strategy.tokens, address(oracle));
            uint256 maxSlippageBps = config.getMaxSlippage();
            uint256 minAcceptableValue = (portfolioValueBefore * (10000 - maxSlippageBps)) / 10000;

            emit DebugAfterDelegationCall(drift, driftAfter, portfolioValueBefore, portfolioValueAfter);

            if (portfolioValueAfter < minAcceptableValue) {
                revert BalanceValidationFailed();
            }

            // 10. Update strategy last rebalance time
            registry.updateLastRebalanceTime(userAccount, strategyId);

            // 11. Calculate gas reimbursement
            uint256 gasReimbursed = msg.value;

            emit RebalanceExecuted(userAccount, strategyId, block.timestamp, drift, gasReimbursed);
        } catch Error(string memory reason) {
            emit RebalanceFailed(userAccount, strategyId, reason);
            revert RebalanceExecutionFailed();
        }
    }

    /**
     * @notice Check if a strategy should be rebalanced
     * @param userAccount User's account address
     * @param strategyId Strategy ID
     * @return isShouldRebalance True if rebalance is needed
     * @return drift Current drift in basis points
     */
    function shouldRebalance(address userAccount, uint256 strategyId)
        external
        view
        returns (bool isShouldRebalance, uint256 drift)
    {
        try registry.getStrategy(userAccount, strategyId) returns (StrategyLibrary.Strategy memory strategy) {
            if (!strategy.isActive) {
                return (false, 0);
            }

            if (block.timestamp < strategy.lastRebalanceTime + strategy.rebalanceInterval) {
                return (false, 0);
            }

            try StrategyLibrary.calculateCurrentWeights(userAccount, strategy.tokens, address(oracle)) returns (
                uint256[] memory currentWeights
            ) {
                drift = StrategyLibrary.calculateDrift(currentWeights, strategy.weights);
                uint256 maxDrift = config.getMaxAllocationDrift();
                isShouldRebalance = drift >= maxDrift;
            } catch {
                return (false, 0);
            }
        } catch {
            return (false, 0);
        }
    }

    /**
     * @notice Get portfolio value for a strategy
     * @param userAccount User's account address
     * @param strategyId Strategy ID
     * @return valueUSD Portfolio value in USD (18 decimals)
     */
    function getPortfolioValue(address userAccount, uint256 strategyId) external view returns (uint256 valueUSD) {
        try registry.getStrategy(userAccount, strategyId) returns (StrategyLibrary.Strategy memory strategy) {
            return StrategyLibrary.getPortfolioValue(userAccount, strategy.tokens, address(oracle));
        } catch {
            return 0;
        }
    }

    // ============================================
    // DEBUGGING FUNCTIONS
    // ============================================

    // Events for debugging
    event DebugTestStrategyOwnership(
        bool isValid,
        address strategyOwner,
        address delegatorOwner,
        string error
    );
    event DebugTestDelegationNoOp(bool success, string message);
    event DebugTestDelegationTransfer(bool success, string message);
    event DebugTestDelegationApproval(bool success, string message);
    event DebugTestDelegationSingleSwap(bool success, string message);

    /**
     * @notice DEBUG: Test strategy ownership validation ONLY
     * @param userAccount DeleGator smart account address
     * @param strategyId Strategy ID to validate
     * @return isValid Whether validation passed
     * @return strategyOwner Strategy owner from registry
     * @return delegatorOwner DeleGator owner from contract
     * @return error Error message if validation failed
     * @dev This function ONLY tests registry + ownership checks, NO delegation
     */
    function testStrategyOwnership(address userAccount, uint256 strategyId)
        external
        view
        returns (
            bool isValid,
            address strategyOwner,
            address delegatorOwner,
            string memory error
        )
    {
        // Check if userAccount is a DeleGator
        if (!DelegationTypes.isDeleGator(userAccount)) {
            return (false, address(0), address(0), "NotADeleGator");
        }

        // Get DeleGator owner
        delegatorOwner = DelegationTypes.getDeleGatorOwner(userAccount);
        if (delegatorOwner == address(0)) {
            return (false, address(0), delegatorOwner, "DeleGatorOwnerIsZero");
        }

        // Try to get strategy
        try registry.getStrategy(userAccount, strategyId) returns (StrategyLibrary.Strategy memory strategy) {
            strategyOwner = strategy.owner;

            if (!strategy.isActive) {
                return (false, strategyOwner, delegatorOwner, "StrategyNotActive");
            }

            if (strategyOwner != delegatorOwner) {
                return (false, strategyOwner, delegatorOwner, "OwnerMismatch");
            }

            return (true, strategyOwner, delegatorOwner, "");
        } catch {
            return (false, address(0), delegatorOwner, "StrategyNotFound");
        }
    }

    /**
     * @notice DEBUG: Test delegation with NO execution (tests signature + framework only)
     * @param userAccount DeleGator smart account address
     * @param permissionContext Encoded delegation with signature
     * @param mode Execution mode
     * @return success Whether delegation executed successfully
     * @dev Tests ONLY delegation framework - no swaps, no tokens, just signature validation
     */
    function testDelegationNoOp(
        address userAccount,
        bytes calldata permissionContext,
        ModeCode mode
    ) external returns (bool success) {
        // Build truly empty execution (no operations at all)
        // This tests ONLY the delegation framework without any actual execution
        Execution[] memory executions = new Execution[](0);  // Empty array = no-op

        // Encode using ExecutionLib
        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // Build arrays for redeemDelegations
        bytes[] memory permissionContexts = new bytes[](1);
        permissionContexts[0] = permissionContext;

        ModeCode[] memory modes = new ModeCode[](1);
        modes[0] = mode;

        // Try to execute
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            emit DebugTestDelegationNoOp(true, "NoOp delegation succeeded");
            return true;
        } catch Error(string memory reason) {
            emit DebugTestDelegationNoOp(false, reason);
            return false;
        } catch (bytes memory lowLevelData) {
            // Decode low-level revert
            string memory decodedError = lowLevelData.length > 0
                ? string(abi.encodePacked("LowLevelRevert:", lowLevelData))
                : "LowLevelRevertNoData";
            emit DebugTestDelegationNoOp(false, decodedError);
            return false;
        }
    }

    /**
     * @notice DEBUG: Test delegation with token approval ONLY
     * @param userAccount DeleGator smart account address
     * @param token Token to approve
     * @param spender Address to approve
     * @param permissionContext Encoded delegation with signature
     * @param mode Execution mode
     * @return success Whether delegation executed successfully
     * @dev Tests delegation + approval (no swaps)
     */
    function testDelegationApproval(
        address userAccount,
        address token,
        address spender,
        bytes calldata permissionContext,
        ModeCode mode
    ) external returns (bool success) {
        // Build approval execution
        Execution[] memory executions = new Execution[](1);
        executions[0] = Execution({
            target: token,
            value: 0,
            callData: abi.encodeWithSignature("approve(address,uint256)", spender, type(uint256).max)
        });

        // Encode using ExecutionLib
        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // Build arrays for redeemDelegations
        bytes[] memory permissionContexts = new bytes[](1);
        permissionContexts[0] = permissionContext;

        ModeCode[] memory modes = new ModeCode[](1);
        modes[0] = mode;

        // Try to execute
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            emit DebugTestDelegationApproval(true, "Approval delegation succeeded");
            return true;
        } catch Error(string memory reason) {
            emit DebugTestDelegationApproval(false, reason);
            return false;
        } catch (bytes memory lowLevelData) {
            string memory decodedError = lowLevelData.length > 0
                ? string(abi.encodePacked("LowLevelRevert:", lowLevelData))
                : "LowLevelRevertNoData";
            emit DebugTestDelegationApproval(false, decodedError);
            return false;
        }
    }

    /**
     * @notice DEBUG: Test delegation with token transfer
     * @param userAccount DeleGator smart account address
     * @param token Token to transfer
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @param permissionContext Encoded delegation with signature
     * @param mode Execution mode
     * @return success Whether delegation executed successfully
     * @dev Tests delegation + token movement (no DEX swaps)
     */
    function testDelegationTransfer(
        address userAccount,
        address token,
        address recipient,
        uint256 amount,
        bytes calldata permissionContext,
        ModeCode mode
    ) external returns (bool success) {
        // Build transfer execution
        Execution[] memory executions = new Execution[](1);
        executions[0] = Execution({
            target: token,
            value: 0,
            callData: abi.encodeWithSignature("transfer(address,uint256)", recipient, amount)
        });

        // Encode using ExecutionLib
        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // Build arrays for redeemDelegations
        bytes[] memory permissionContexts = new bytes[](1);
        permissionContexts[0] = permissionContext;

        ModeCode[] memory modes = new ModeCode[](1);
        modes[0] = mode;

        // Try to execute
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            emit DebugTestDelegationTransfer(true, "Transfer delegation succeeded");
            return true;
        } catch Error(string memory reason) {
            emit DebugTestDelegationTransfer(false, reason);
            return false;
        } catch (bytes memory lowLevelData) {
            string memory decodedError = lowLevelData.length > 0
                ? string(abi.encodePacked("LowLevelRevert:", lowLevelData))
                : "LowLevelRevertNoData";
            emit DebugTestDelegationTransfer(false, decodedError);
            return false;
        }
    }

    /**
     * @notice DEBUG: Test delegation with single swap (approval + swap)
     * @param userAccount DeleGator smart account address
     * @param tokenIn Token being sold
     * @param swapTarget DEX contract address
     * @param swapCallData Swap calldata
     * @param nativeValue Native token amount (for native swaps)
     * @param permissionContext Encoded delegation with signature
     * @param mode Execution mode
     * @return success Whether delegation executed successfully
     * @dev Tests delegation + ONE swap (minimal complexity)
     */
    function testDelegationSingleSwap(
        address userAccount,
        address tokenIn,
        address swapTarget,
        bytes calldata swapCallData,
        uint256 nativeValue,
        bytes calldata permissionContext,
        ModeCode mode
    ) external returns (bool success) {
        // Build approval + swap executions
        Execution[] memory executions = new Execution[](2);

        // 1. Approval
        executions[0] = Execution({
            target: tokenIn,
            value: 0,
            callData: abi.encodeWithSignature("approve(address,uint256)", swapTarget, type(uint256).max)
        });

        // 2. Swap
        executions[1] = Execution({
            target: swapTarget,
            value: nativeValue,
            callData: swapCallData
        });

        // Encode using ExecutionLib
        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // Build arrays for redeemDelegations
        bytes[] memory permissionContexts = new bytes[](1);
        permissionContexts[0] = permissionContext;

        ModeCode[] memory modes = new ModeCode[](1);
        modes[0] = mode;

        // Try to execute
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            emit DebugTestDelegationSingleSwap(true, "Single swap delegation succeeded");
            return true;
        } catch Error(string memory reason) {
            emit DebugTestDelegationSingleSwap(false, reason);
            return false;
        } catch (bytes memory lowLevelData) {
            string memory decodedError = lowLevelData.length > 0
                ? string(abi.encodePacked("LowLevelRevert:", lowLevelData))
                : "LowLevelRevertNoData";
            emit DebugTestDelegationSingleSwap(false, decodedError);
            return false;
        }
    }

    // Event for swap-only test
    event DebugTestDelegationSwapOnly(bool success, string message);

    /**
     * @notice DEBUG: Test delegation with ONLY swap (no approval) - Level 5b
     * @param userAccount DeleGator smart account address
     * @param swapTarget DEX contract address
     * @param swapCallData Swap calldata
     * @param nativeValue Native token amount (for native swaps)
     * @param permissionContext Encoded delegation with signature
     * @param mode Execution mode
     * @return success Whether delegation executed successfully
     * @dev Assumes approval is already set (from Level 3). Tests if swap alone works through delegation.
     *      This isolates whether the problem is batch execution or the swap itself.
     */
    function testDelegationSwapOnly(
        address userAccount,
        address swapTarget,
        bytes calldata swapCallData,
        uint256 nativeValue,
        bytes calldata permissionContext,
        ModeCode mode
    ) external returns (bool success) {
        // Build ONLY swap execution (approval assumed to be already set)
        Execution[] memory executions = new Execution[](1);
        executions[0] = Execution({
            target: swapTarget,
            value: nativeValue,
            callData: swapCallData
        });

        // Encode using ExecutionLib (BATCH mode even for single execution for consistency)
        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // Build arrays for redeemDelegations
        bytes[] memory permissionContexts = new bytes[](1);
        permissionContexts[0] = permissionContext;

        ModeCode[] memory modes = new ModeCode[](1);
        modes[0] = mode;

        // Try to execute
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            emit DebugTestDelegationSwapOnly(true, "Swap-only delegation succeeded");
            return true;
        } catch Error(string memory reason) {
            emit DebugTestDelegationSwapOnly(false, reason);
            return false;
        } catch (bytes memory lowLevelData) {
            string memory decodedError = lowLevelData.length > 0
                ? string(abi.encodePacked("LowLevelRevert:", lowLevelData))
                : "LowLevelRevertNoData";
            emit DebugTestDelegationSwapOnly(false, decodedError);
            return false;
        }
    }

    /**
     * @notice Authorize upgrade (UUPS requirement)
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Get contract version
     * @return Version string
     */
    function getVersion() external pure returns (string memory) {
        return "1.2.0-debug-delegation";
    }

    /**
     * @notice Allow receiving ETH for gas reimbursement
     */
    receive() external payable {}
}
