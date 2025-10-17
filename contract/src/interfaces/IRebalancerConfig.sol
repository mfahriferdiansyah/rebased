// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IRebalancerConfig
 * @notice Interface for system-wide configuration storage
 * @dev Manages fees, slippage, intervals, and token whitelist
 */
interface IRebalancerConfig {
    // Events
    event MaxSlippageUpdated(uint256 oldValue, uint256 newValue);
    event MinRebalanceIntervalUpdated(uint256 oldValue, uint256 newValue);
    event MaxAllocationDriftUpdated(uint256 oldValue, uint256 newValue);
    event ManagementFeeUpdated(uint256 oldValue, uint256 newValue);
    event PerformanceFeeUpdated(uint256 oldValue, uint256 newValue);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);

    /**
     * @notice Get the contract version
     * @return Version string
     */
    function getVersion() external pure returns (string memory);

    /**
     * @notice Set maximum slippage in basis points
     * @param bps Basis points (e.g., 50 = 0.5%)
     */
    function setMaxSlippage(uint256 bps) external;

    /**
     * @notice Set minimum rebalance interval in seconds
     * @param seconds_ Minimum seconds between rebalances
     */
    function setMinRebalanceInterval(uint256 seconds_) external;

    /**
     * @notice Set maximum allocation drift in basis points
     * @param bps Basis points (e.g., 500 = 5%)
     */
    function setMaxAllocationDrift(uint256 bps) external;

    /**
     * @notice Set management fee in basis points (annual)
     * @param bps Basis points (e.g., 50 = 0.5% annual)
     */
    function setManagementFee(uint256 bps) external;

    /**
     * @notice Set performance fee in basis points
     * @param bps Basis points (e.g., 1000 = 10%)
     */
    function setPerformanceFee(uint256 bps) external;

    /**
     * @notice Set fee recipient address
     * @param recipient The address to receive fees
     */
    function setFeeRecipient(address recipient) external;

    /**
     * @notice Add a token to the whitelist
     * @param token The token address to whitelist
     */
    function addWhitelistedToken(address token) external;

    /**
     * @notice Remove a token from the whitelist
     * @param token The token address to remove
     */
    function removeWhitelistedToken(address token) external;

    /**
     * @notice Check if a token is whitelisted
     * @param token The token address to check
     * @return true if the token is whitelisted
     */
    function isTokenWhitelisted(address token) external view returns (bool);

    /**
     * @notice Get maximum slippage in basis points
     * @return Basis points
     */
    function getMaxSlippage() external view returns (uint256);

    /**
     * @notice Get minimum rebalance interval in seconds
     * @return Seconds
     */
    function getMinRebalanceInterval() external view returns (uint256);

    /**
     * @notice Get maximum allocation drift in basis points
     * @return Basis points
     */
    function getMaxAllocationDrift() external view returns (uint256);

    /**
     * @notice Get management fee in basis points
     * @return Basis points
     */
    function getManagementFee() external view returns (uint256);

    /**
     * @notice Get performance fee in basis points
     * @return Basis points
     */
    function getPerformanceFee() external view returns (uint256);

    /**
     * @notice Get fee recipient address
     * @return The fee recipient address
     */
    function getFeeRecipient() external view returns (address);
}
