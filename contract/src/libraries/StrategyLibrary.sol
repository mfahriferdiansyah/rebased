// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/IPythOracle.sol";

/**
 * @title StrategyLibrary
 * @notice Pure calculation logic for portfolio strategies (no state)
 * @dev Used by RebalanceExecutor to calculate rebalance swaps
 *
 * Non-custodial: All calculations based on user's MetaMask account balances
 */
library StrategyLibrary {
    struct Strategy {
        uint256 id;
        address owner;        // EOA that owns the DeleGator smart account
        address delegator;    // DeleGator smart account address (holds funds)
        address[] tokens;
        uint256[] weights;  // Basis points (100 = 1%)
        uint256 rebalanceInterval;
        uint256 lastRebalanceTime;
        bool isActive;
        string name;
    }

    error InvalidWeights();
    error InvalidTokenCount();
    error ZeroAddress();

    /**
     * @notice Calculate required swaps to rebalance portfolio
     * @param account DeleGator smart account address (holds funds)
     * @param strategy Strategy configuration
     * @param oracle Price oracle address
     * @return tokensToSell Tokens that need to be sold
     * @return tokensToBuy Tokens that need to be bought
     * @return amountsToSell Amounts to sell for each token
     */
    function calculateRebalanceSwaps(
        address account,
        Strategy memory strategy,
        address oracle
    )
        external
        view
        returns (address[] memory tokensToSell, address[] memory tokensToBuy, uint256[] memory amountsToSell)
    {
        require(account != address(0), "Invalid account");
        require(oracle != address(0), "Invalid oracle");

        // Get current balances from user's account
        uint256[] memory balances = new uint256[](strategy.tokens.length);
        for (uint256 i = 0; i < strategy.tokens.length; i++) {
            balances[i] = IERC20(strategy.tokens[i]).balanceOf(account);
        }

        // Get current prices
        uint256[] memory prices = IPythOracle(oracle).batchGetPrices(strategy.tokens);

        // Calculate total portfolio value
        uint256 totalValueUSD = 0;
        for (uint256 i = 0; i < strategy.tokens.length; i++) {
            // Adjust for token decimals
            uint8 decimals = IERC20Metadata(strategy.tokens[i]).decimals();
            uint256 valueUSD = (balances[i] * prices[i]) / (10 ** decimals);
            totalValueUSD += valueUSD;
        }

        // Calculate target values for each token
        uint256[] memory targetValuesUSD = new uint256[](strategy.tokens.length);
        for (uint256 i = 0; i < strategy.tokens.length; i++) {
            targetValuesUSD[i] = (totalValueUSD * strategy.weights[i]) / 10000;
        }

        // Calculate current values for each token
        uint256[] memory currentValuesUSD = new uint256[](strategy.tokens.length);
        for (uint256 i = 0; i < strategy.tokens.length; i++) {
            uint8 decimals = IERC20Metadata(strategy.tokens[i]).decimals();
            currentValuesUSD[i] = (balances[i] * prices[i]) / (10 ** decimals);
        }

        // Determine which tokens to sell and buy
        uint256 sellCount = 0;
        uint256 buyCount = 0;

        for (uint256 i = 0; i < strategy.tokens.length; i++) {
            if (currentValuesUSD[i] > targetValuesUSD[i]) {
                sellCount++;
            } else if (currentValuesUSD[i] < targetValuesUSD[i]) {
                buyCount++;
            }
        }

        tokensToSell = new address[](sellCount);
        tokensToBuy = new address[](buyCount);
        amountsToSell = new uint256[](sellCount);

        uint256 sellIndex = 0;
        uint256 buyIndex = 0;

        for (uint256 i = 0; i < strategy.tokens.length; i++) {
            if (currentValuesUSD[i] > targetValuesUSD[i]) {
                tokensToSell[sellIndex] = strategy.tokens[i];

                // Calculate amount to sell (in token units)
                uint256 excessValueUSD = currentValuesUSD[i] - targetValuesUSD[i];
                uint8 decimals = IERC20Metadata(strategy.tokens[i]).decimals();
                amountsToSell[sellIndex] = (excessValueUSD * (10 ** decimals)) / prices[i];

                sellIndex++;
            } else if (currentValuesUSD[i] < targetValuesUSD[i]) {
                tokensToBuy[buyIndex] = strategy.tokens[i];
                buyIndex++;
            }
        }
    }

    /**
     * @notice Calculate current allocation weights
     * @param account DeleGator smart account address (holds funds)
     * @param tokens Token addresses
     * @param oracle Price oracle address
     * @return weights Current weights in basis points
     */
    function calculateCurrentWeights(address account, address[] memory tokens, address oracle)
        external
        view
        returns (uint256[] memory weights)
    {
        require(account != address(0), "Invalid account");
        require(oracle != address(0), "Invalid oracle");

        uint256[] memory balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(account);
        }

        uint256[] memory prices = IPythOracle(oracle).batchGetPrices(tokens);

        uint256 totalValueUSD = 0;
        uint256[] memory valuesUSD = new uint256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            uint8 decimals = IERC20Metadata(tokens[i]).decimals();
            valuesUSD[i] = (balances[i] * prices[i]) / (10 ** decimals);
            totalValueUSD += valuesUSD[i];
        }

        weights = new uint256[](tokens.length);
        if (totalValueUSD == 0) {
            return weights; // All zeros if no balance
        }

        for (uint256 i = 0; i < tokens.length; i++) {
            weights[i] = (valuesUSD[i] * 10000) / totalValueUSD;
        }
    }

    /**
     * @notice Calculate drift between current and target weights
     * @param currentWeights Current allocation in basis points
     * @param targetWeights Target allocation in basis points
     * @return drift Maximum deviation in basis points
     */
    function calculateDrift(uint256[] memory currentWeights, uint256[] memory targetWeights)
        external
        pure
        returns (uint256 drift)
    {
        require(currentWeights.length == targetWeights.length, "Length mismatch");

        drift = 0;
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];

            if (deviation > drift) {
                drift = deviation;
            }
        }
    }

    /**
     * @notice Get total portfolio value in USD
     * @param account DeleGator smart account address (holds funds)
     * @param tokens Token addresses
     * @param oracle Price oracle address
     * @return totalValueUSD Portfolio value scaled to 18 decimals
     */
    function getPortfolioValue(address account, address[] memory tokens, address oracle)
        external
        view
        returns (uint256 totalValueUSD)
    {
        require(account != address(0), "Invalid account");
        require(oracle != address(0), "Invalid oracle");

        uint256[] memory balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(account);
        }

        uint256[] memory prices = IPythOracle(oracle).batchGetPrices(tokens);

        totalValueUSD = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            uint8 decimals = IERC20Metadata(tokens[i]).decimals();
            uint256 valueUSD = (balances[i] * prices[i]) / (10 ** decimals);
            totalValueUSD += valueUSD;
        }
    }

    /**
     * @notice Validate strategy parameters
     * @param tokens Token addresses
     * @param weights Token weights in basis points
     */
    function validateStrategy(address[] memory tokens, uint256[] memory weights) external pure {
        if (tokens.length == 0 || tokens.length > 10) {
            revert InvalidTokenCount();
        }

        if (tokens.length != weights.length) {
            revert InvalidTokenCount();
        }

        // Check no zero addresses
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                revert ZeroAddress();
            }
        }

        // Check weights sum to 10000 (100%)
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }

        if (totalWeight != 10000) {
            revert InvalidWeights();
        }
    }
}
