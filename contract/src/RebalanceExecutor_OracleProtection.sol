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
 * @notice ENHANCED VERSION with Oracle Feed Protection
 * @dev Prevents oracle feed substitution attacks via automatic snapshot validation
 *
 * SECURITY ENHANCEMENT:
 * - Automatically snapshots oracle feed IDs on first rebalance
 * - Validates feed IDs haven't changed on subsequent rebalances
 * - Protects users from feed substitution attacks
 * - Zero user action required (fully automatic)
 *
 * IMPLEMENTATION: Easiest possible approach
 * - No signature changes
 * - No struct migrations
 * - No frontend changes
 * - Just 1 mapping + minimal validation logic
 */
contract RebalanceExecutor is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IDelegationManager public delegationManager;
    StrategyRegistry public registry;
    IPythOracle public oracle;
    IUniswapHelper public uniswapHelper;
    IRebalancerConfig public config;

    mapping(address => bool) public approvedDEXs;
    bool public paused;

    // ✅ NEW: Oracle feed snapshot protection
    // Stores expected feed IDs for each user's strategy (set on first rebalance)
    mapping(address user => mapping(uint256 strategyId => bytes32[] expectedFeedIds))
        private _strategyOracleSnapshot;

    // Events
    event RebalanceExecuted(
        address indexed user, uint256 indexed strategyId, uint256 timestamp, uint256 drift, uint256 gasReimbursed
    );
    event RebalanceFailed(address indexed user, uint256 indexed strategyId, string reason);
    event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event DEXApprovalUpdated(address indexed dex, bool approved);
    event EmergencyPaused(address indexed caller);
    event EmergencyUnpaused(address indexed caller);

    // ✅ NEW: Oracle snapshot events
    event OracleSnapshotCreated(address indexed user, uint256 indexed strategyId, bytes32[] feedIds);
    event OracleSnapshotReset(address indexed user, uint256 indexed strategyId);
    event OracleSnapshotValidated(address indexed user, uint256 indexed strategyId);

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

    // ✅ NEW: Oracle security errors
    error OracleFeedChanged(address token, bytes32 expected, bytes32 actual);
    error TokenCountMismatch();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

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

        paused = false;
    }

    // ============================================
    // DEX APPROVAL & PAUSE (existing)
    // ============================================

    function setDEXApproval(address dex, bool approved) external onlyOwner {
        require(dex != address(0), "Invalid DEX address");
        approvedDEXs[dex] = approved;
        emit DEXApprovalUpdated(dex, approved);
    }

    function batchSetDEXApproval(address[] calldata dexs, bool approved) external onlyOwner {
        for (uint256 i = 0; i < dexs.length; i++) {
            require(dexs[i] != address(0), "Invalid DEX address");
            approvedDEXs[dexs[i]] = approved;
            emit DEXApprovalUpdated(dexs[i], approved);
        }
    }

    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    function setDelegationManager(address _newDelegationManager) external onlyOwner {
        require(_newDelegationManager != address(0), "Invalid delegation manager");
        delegationManager = IDelegationManager(_newDelegationManager);
    }

    // ============================================
    // ✅ NEW: ORACLE SNAPSHOT MANAGEMENT
    // ============================================

    /**
     * @notice Get oracle snapshot for a strategy
     * @param user User account address
     * @param strategyId Strategy ID
     * @return feedIds Array of expected feed IDs (empty if no snapshot)
     */
    function getOracleSnapshot(address user, uint256 strategyId)
        external view returns (bytes32[] memory feedIds)
    {
        return _strategyOracleSnapshot[user][strategyId];
    }

    /**
     * @notice Check if oracle snapshot exists for a strategy
     * @param user User account address
     * @param strategyId Strategy ID
     * @return exists True if snapshot exists
     */
    function hasOracleSnapshot(address user, uint256 strategyId)
        external view returns (bool exists)
    {
        return _strategyOracleSnapshot[user][strategyId].length > 0;
    }

    /**
     * @notice Manually reset oracle snapshot (allows user to update oracle config)
     * @param strategyId Strategy ID to reset
     * @dev Only strategy owner can reset. Next rebalance will create new snapshot.
     */
    function resetOracleSnapshot(uint256 strategyId) external {
        StrategyLibrary.Strategy memory strategy = registry.getStrategy(msg.sender, strategyId);
        require(strategy.owner == msg.sender, "Not strategy owner");

        delete _strategyOracleSnapshot[msg.sender][strategyId];
        emit OracleSnapshotReset(msg.sender, strategyId);
    }

    /**
     * @notice Validate current oracle feeds match snapshot
     * @param userAccount User account address
     * @param strategyId Strategy ID
     * @param strategy Strategy struct (already loaded to save gas)
     * @dev Internal function called during rebalance
     */
    function _validateOracleSnapshot(
        address userAccount,
        uint256 strategyId,
        StrategyLibrary.Strategy memory strategy
    ) internal {
        bytes32[] storage snapshot = _strategyOracleSnapshot[userAccount][strategyId];

        if (snapshot.length == 0) {
            // ✅ First rebalance: CREATE snapshot
            for (uint256 i = 0; i < strategy.tokens.length; i++) {
                bytes32 feedId = oracle.priceFeeds(strategy.tokens[i]);
                snapshot.push(feedId);
            }
            emit OracleSnapshotCreated(userAccount, strategyId, snapshot);
        } else {
            // ✅ Subsequent rebalances: VALIDATE against snapshot
            if (snapshot.length != strategy.tokens.length) {
                revert TokenCountMismatch();
            }

            for (uint256 i = 0; i < strategy.tokens.length; i++) {
                bytes32 expectedFeed = snapshot[i];
                bytes32 currentFeed = oracle.priceFeeds(strategy.tokens[i]);

                if (currentFeed != expectedFeed) {
                    revert OracleFeedChanged(strategy.tokens[i], expectedFeed, currentFeed);
                }
            }

            emit OracleSnapshotValidated(userAccount, strategyId);
        }
    }

    // ============================================
    // REBALANCE EXECUTION (with oracle protection)
    // ============================================

    /**
     * @notice Execute a rebalance for a user's strategy
     * @dev ENHANCED with automatic oracle feed validation
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
        // 1. Get strategy from registry
        StrategyLibrary.Strategy memory strategy = registry.getStrategy(userAccount, strategyId);

        // 2. Validate userAccount is a DeleGator smart account
        if (!DelegationTypes.isDeleGator(userAccount)) {
            revert NotADeleGator();
        }

        // 3. Verify strategy owner matches DeleGator owner
        address delegatorOwner = DelegationTypes.getDeleGatorOwner(userAccount);
        if (delegatorOwner == address(0) || delegatorOwner != strategy.owner) {
            revert InvalidDeleGatorOwner();
        }

        // 4. Validate strategy is active
        if (!strategy.isActive) {
            revert StrategyNotActive();
        }

        if (block.timestamp < strategy.lastRebalanceTime + strategy.rebalanceInterval) {
            revert TooSoonToRebalance();
        }

        // ✅ 5. NEW: Validate oracle feeds haven't changed (SECURITY CRITICAL)
        _validateOracleSnapshot(userAccount, strategyId, strategy);

        // 6. Calculate current drift and portfolio value BEFORE swaps
        uint256[] memory currentWeightsBefore =
            StrategyLibrary.calculateCurrentWeights(userAccount, strategy.tokens, address(oracle));
        uint256 drift = StrategyLibrary.calculateDrift(currentWeightsBefore, strategy.weights);
        uint256 portfolioValueBefore = StrategyLibrary.getPortfolioValue(userAccount, strategy.tokens, address(oracle));

        // 7. Check drift exceeds threshold
        uint256 maxDrift = config.getMaxAllocationDrift();
        if (drift < maxDrift) {
            revert DriftBelowThreshold();
        }

        // 8. Validate swap data
        require(tokensIn.length == swapTargets.length, "TokensIn length mismatch");
        require(swapTargets.length == swapCallDatas.length, "Swap arrays length mismatch");
        require(swapTargets.length == minOutputAmounts.length, "Min output amounts length mismatch");
        require(swapTargets.length == nativeValues.length, "Native values length mismatch");
        require(swapTargets.length > 0, "No swaps provided");

        // 9. Validate DEXs are approved
        for (uint256 i = 0; i < swapTargets.length; i++) {
            if (!approvedDEXs[swapTargets[i]]) {
                revert UnapprovedDEX(swapTargets[i]);
            }
        }

        // 10. Validate slippage protection
        for (uint256 i = 0; i < minOutputAmounts.length; i++) {
            if (minOutputAmounts[i] == 0) {
                revert InsufficientSlippageProtection();
            }
        }

        // 11. Build execution calldata for swaps
        Execution[] memory executions = new Execution[](swapTargets.length * 2);
        uint256 idx = 0;

        for (uint256 i = 0; i < swapTargets.length; i++) {
            // Approval
            executions[idx++] = Execution({
                target: tokensIn[i],
                value: 0,
                callData: abi.encodeWithSignature(
                    "approve(address,uint256)",
                    swapTargets[i],
                    type(uint256).max
                )
            });

            // Swap
            executions[idx++] = Execution({
                target: swapTargets[i],
                value: nativeValues[i],
                callData: swapCallDatas[i]
            });
        }

        bytes[] memory executionCallDatas = new bytes[](1);
        executionCallDatas[0] = ExecutionLib.encodeBatch(executions);

        // 12. Execute via DelegationManager
        try delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas) {
            // 13. Validate swaps improved allocation
            uint256[] memory currentWeightsAfter =
                StrategyLibrary.calculateCurrentWeights(userAccount, strategy.tokens, address(oracle));
            uint256 driftAfter = StrategyLibrary.calculateDrift(currentWeightsAfter, strategy.weights);

            if (driftAfter >= drift) {
                revert SwapsDidNotImproveAllocation();
            }

            // 14. Validate portfolio value
            uint256 portfolioValueAfter =
                StrategyLibrary.getPortfolioValue(userAccount, strategy.tokens, address(oracle));
            uint256 maxSlippageBps = config.getMaxSlippage();
            uint256 minAcceptableValue = (portfolioValueBefore * (10000 - maxSlippageBps)) / 10000;

            if (portfolioValueAfter < minAcceptableValue) {
                revert BalanceValidationFailed();
            }

            // 15. Update last rebalance time
            registry.updateLastRebalanceTime(userAccount, strategyId);

            emit RebalanceExecuted(userAccount, strategyId, block.timestamp, drift, msg.value);
        } catch Error(string memory reason) {
            emit RebalanceFailed(userAccount, strategyId, reason);
            revert RebalanceExecutionFailed();
        }
    }

    // ============================================
    // VIEW FUNCTIONS (existing)
    // ============================================

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

    function getPortfolioValue(address userAccount, uint256 strategyId) external view returns (uint256 valueUSD) {
        try registry.getStrategy(userAccount, strategyId) returns (StrategyLibrary.Strategy memory strategy) {
            return StrategyLibrary.getPortfolioValue(userAccount, strategy.tokens, address(oracle));
        } catch {
            return 0;
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function getVersion() external pure returns (string memory) {
        return "1.3.0-oracle-protection";
    }

    receive() external payable {}
}
