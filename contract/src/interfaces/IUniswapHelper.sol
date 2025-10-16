// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IUniswapHelper
 * @notice Interface for Uniswap V2 interaction helper
 * @dev Wraps Uniswap V2 Router with slippage protection and quote functions
 */
interface IUniswapHelper {
    // Events
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );

    // Errors
    error InsufficientOutput(uint256 amountOut, uint256 minAmountOut);
    error NoLiquidity(address tokenA, address tokenB);
    error InvalidPath();

    /**
     * @notice Get the contract version
     * @return Version string
     */
    function getVersion() external pure returns (string memory);

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
        uint256 deadline  // HIGH-002: Added deadline parameter for MEV protection
    ) external returns (uint256 amountOut);

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
    ) external view returns (uint256);

    /**
     * @notice Check if a pair has liquidity
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return true if the pair has liquidity
     */
    function hasLiquidity(address tokenA, address tokenB) external view returns (bool);

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
    ) external view returns (uint256);
}
