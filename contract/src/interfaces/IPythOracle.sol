// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IPythOracle
 * @notice Interface for PythOracle wrapper contract
 */
interface IPythOracle {
    // Events
    event PriceFeedSet(address indexed token, bytes32 indexed feedId);
    event PriceFeedRemoved(address indexed token);
    event MaxPriceAgeUpdated(uint256 oldValue, uint256 newValue);
    event MaxConfidenceRatioUpdated(uint256 oldValue, uint256 newValue);
    event PythContractUpdated(address indexed oldContract, address indexed newContract);

    // Errors
    error NoFeedConfigured(address token);
    error InvalidPrice(address token, int64 price);
    error ConfidenceTooLow(uint64 conf, uint64 price, uint256 ratio);

    // Configuration
    function setPriceFeed(address token, bytes32 feedId) external;
    function removePriceFeed(address token) external;
    function setMaxPriceAge(uint256 seconds_) external;
    function setMaxConfidenceRatio(uint256 bps) external;
    function setPythContract(address pythContract_) external;

    // Price queries
    function getPrice(address token) external view returns (uint256 price);
    function batchGetPrices(address[] calldata tokens) external view returns (uint256[] memory prices);
    function isPriceFresh(address token) external view returns (bool);

    // Getters
    function getVersion() external pure returns (string memory);
    function getPythContract() external view returns (address);
    function oracle() external view returns (address);
    function pythContract() external view returns (address);
    function priceFeeds(address token) external view returns (bytes32);
}
