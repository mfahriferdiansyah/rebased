// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../src/interfaces/IUniswapV2Router02.sol";

/**
 * @title MockUniswapRouter
 * @notice Mock Uniswap V2 Router for testing
 */
contract MockUniswapRouter is IUniswapV2Router02 {
    address private _factory;
    uint256 private _exchangeRate; // Price of tokenOut in terms of tokenIn (scaled by 1e18)
    bool private _shouldRevert;

    constructor(address factory_) {
        _factory = factory_;
        _exchangeRate = 1e18; // 1:1 by default
    }

    function factory() external pure override returns (address) {
        return address(0x123); // Return constant for testing
    }

    function setExchangeRate(uint256 rate) external {
        _exchangeRate = rate;
    }

    function setShouldRevert(bool shouldRevert) external {
        _shouldRevert = shouldRevert;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint // deadline
    ) external override returns (uint[] memory amounts) {
        require(!_shouldRevert, "Mock revert");
        require(path.length >= 2, "Invalid path");

        amounts = new uint[](path.length);
        amounts[0] = amountIn;

        // Simple 1:1 swap for testing, adjusted by exchange rate
        uint256 amountOut = (amountIn * _exchangeRate) / 1e18;
        amounts[1] = amountOut;

        require(amountOut >= amountOutMin, "Insufficient output");

        // Transfer tokens
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[1]).transfer(to, amountOut);

        return amounts;
    }

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view override returns (uint[] memory amounts) {
        require(!_shouldRevert, "Mock revert");
        require(path.length >= 2, "Invalid path");

        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        amounts[1] = (amountIn * _exchangeRate) / 1e18;

        return amounts;
    }
}
