// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapHelper.sol";
import "./interfaces/IUniswapV2Router02.sol";

/**
 * @title UniswapHelper
 * @notice Wrapper for Uniswap V2 Router with slippage protection
 * @dev Upgradeable contract using UUPS pattern
 */
contract UniswapHelper is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    IUniswapHelper
{
    using SafeERC20 for IERC20;

    /// @notice Contract version
    string public constant version = "1.0.0";

    /// @notice Uniswap V2 Router address
    IUniswapV2Router02 public router;

    /// @notice Uniswap V2 Factory address
    address public factory;

    /// @notice Constant for basis points calculation
    uint256 private constant BPS_BASE = 10000;

    /**
     * @dev Storage gap for future upgrades
     * Reserves storage slots for future variables without shifting existing ones
     * Reduced to 49 to account for ReentrancyGuardUpgradeable storage slot
     */
    uint256[49] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract
     * @param _router The Uniswap V2 Router address
     * @param _factory The Uniswap V2 Factory address
     */
    function initialize(address _router, address _factory) external initializer {
        require(_router != address(0), "Invalid router");
        require(_factory != address(0), "Invalid factory");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        router = IUniswapV2Router02(_router);
        factory = _factory;
    }

    /**
     * @notice Get the contract version
     * @return Version string
     */
    function getVersion() external pure override returns (string memory) {
        return version;
    }

    /**
     * @notice Swap exact tokens for tokens
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The input amount
     * @param minAmountOut The minimum output amount (slippage protection)
     * @param recipient The recipient address
     * @param deadline The transaction deadline (unix timestamp)
     * @return amountOut The actual output amount
     */
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline  // HIGH-002: Added deadline parameter
    ) external override nonReentrant returns (uint256 amountOut) {
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");
        require(amountIn > 0, "Invalid amountIn");
        require(recipient != address(0), "Invalid recipient");
        // HIGH-002 FIX: Validate deadline to prevent MEV attacks
        require(deadline >= block.timestamp, "Deadline expired");

        // Transfer tokens from caller to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router to spend tokens (exact amount, not unlimited)
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        // Build swap path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // HIGH-002 FIX: Use provided deadline instead of hardcoded value
        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            recipient,
            deadline  // Use caller-provided deadline
        );

        amountOut = amounts[1];

        // Verify output amount meets minimum
        if (amountOut < minAmountOut) {
            revert InsufficientOutput(amountOut, minAmountOut);
        }

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    /**
     * @notice Get the expected output amount for a given input
     * @param amountIn The input amount
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @return The expected output amount
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view override returns (uint256) {
        require(amountIn > 0, "Invalid amountIn");
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    /**
     * @notice Check if a pair has liquidity
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return true if the pair has liquidity
     */
    function hasLiquidity(address tokenA, address tokenB) external view override returns (bool) {
        require(tokenA != address(0), "Invalid tokenA");
        require(tokenB != address(0), "Invalid tokenB");

        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;

        try router.getAmountsOut(1e18, path) returns (uint256[] memory) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @notice Calculate minimum output amount with slippage
     * @param amountIn The input amount
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param slippageBps Slippage in basis points (e.g., 50 = 0.5%)
     * @return The minimum output amount
     */
    function calculateMinAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint256 slippageBps
    ) external view override returns (uint256) {
        require(slippageBps <= BPS_BASE, "Invalid slippage");

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            uint256 expectedOut = amounts[1];
            // Calculate minimum with slippage: expectedOut * (10000 - slippageBps) / 10000
            return (expectedOut * (BPS_BASE - slippageBps)) / BPS_BASE;
        } catch {
            revert NoLiquidity(tokenIn, tokenOut);
        }
    }

    /**
     * @notice Authorize upgrade (UUPS requirement)
     * @param newImplementation The new implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
