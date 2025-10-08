// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title MockPythOracle
 * @notice Simplified mock implementation of Pyth oracle for testing
 * @dev Much simpler than the full MockPyth - just what we need for tests
 */
contract MockPythOracle is IPyth {
    // Storage for mock prices
    struct MockPrice {
        int64 price;
        int32 expo;
        uint64 conf;
        uint256 publishTime;
        bool exists;
    }

    mapping(bytes32 => MockPrice) public prices;
    bool public shouldRevert;
    uint256 public validTimePeriod = 60;

    function setPrice(bytes32 id, int64 price, int32 expo, uint64 conf) external {
        prices[id] = MockPrice({
            price: price,
            expo: expo,
            conf: conf,
            publishTime: block.timestamp,
            exists: true
        });
    }

    function setPublishTime(bytes32 id, uint256 publishTime) external {
        require(prices[id].exists, "Price not set");
        prices[id].publishTime = publishTime;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function getPriceNoOlderThan(bytes32 id, uint256 age)
        external
        view
        override
        returns (PythStructs.Price memory)
    {
        require(!shouldRevert, "Mock revert");
        require(prices[id].exists, "Price not set");

        MockPrice memory mp = prices[id];

        // Check staleness
        require(block.timestamp - mp.publishTime <= age, "Price too old");

        return PythStructs.Price({
            price: mp.price,
            conf: mp.conf,
            expo: mp.expo,
            publishTime: mp.publishTime
        });
    }

    function getPrice(bytes32 id) external view override returns (PythStructs.Price memory) {
        require(!shouldRevert, "Mock revert");
        require(prices[id].exists, "Price not set");

        MockPrice memory mp = prices[id];
        return PythStructs.Price({
            price: mp.price,
            conf: mp.conf,
            expo: mp.expo,
            publishTime: mp.publishTime
        });
    }

    function getUpdateFee(bytes[] calldata /* updateData */)
        external
        pure
        override
        returns (uint256)
    {
        return 0; // Free for testing
    }

    function updatePriceFeeds(bytes[] calldata /* updateData */)
        external
        payable
        override
    {
        // No-op for testing
    }

    function getValidTimePeriod() external view override returns (uint) {
        return validTimePeriod;
    }

    function getEmaPrice(bytes32 id) external view override returns (PythStructs.Price memory) {
        return this.getPrice(id);
    }

    function parsePriceFeedUpdates(
        bytes[] calldata /* updateData */,
        bytes32[] calldata /* priceIds */,
        uint64 /* minPublishTime */,
        uint64 /* maxPublishTime */
    ) external payable override returns (PythStructs.PriceFeed[] memory) {
        revert("Not implemented");
    }

    // Additional required functions from IPyth
    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory) {
        return this.getPrice(id);
    }

    function getEmaPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory) {
        return this.getPrice(id);
    }

    function getEmaPriceNoOlderThan(bytes32 id, uint256 age) external view returns (PythStructs.Price memory) {
        return this.getPriceNoOlderThan(id, age);
    }

    function updatePriceFeedsIfNecessary(
        bytes[] calldata /* updateData */,
        bytes32[] calldata /* priceIds */,
        uint64[] calldata /* publishTimes */
    ) external payable {
        // No-op for testing
    }

    /**
     * @notice Batch get prices for multiple tokens
     * @dev For testing: returns fixed prices (2000 * 1e18 for each token)
     */
    function batchGetPrices(address[] calldata tokens) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            // Return fixed price of $2000 for all tokens (scaled to 18 decimals)
            result[i] = 2000 * 1e18;
        }
        return result;
    }
}
