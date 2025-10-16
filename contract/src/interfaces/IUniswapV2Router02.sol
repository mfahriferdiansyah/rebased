// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IUniswapV2Router02
 * @notice Interface for Uniswap V2 Router on Monad testnet
 * @dev Minimal interface with only the functions we need for swapping
 */
interface IUniswapV2Router02 {
    /**
     * @notice Get the factory address
     * @return The address of the Uniswap V2 factory
     */
    function factory() external pure returns (address);

    /**
     * @notice Swap exact tokens for tokens
     * @param amountIn The amount of input tokens
     * @param amountOutMin The minimum amount of output tokens
     * @param path The swap path (array of token addresses)
     * @param to The recipient address
     * @param deadline The transaction deadline
     * @return amounts Array of amounts for each step in the path
     */
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    /**
     * @notice Get the output amount for a given input amount and path
     * @param amountIn The input amount
     * @param path The swap path (array of token addresses)
     * @return amounts Array of amounts for each step in the path
     */
    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}
