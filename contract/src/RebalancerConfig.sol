// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IRebalancerConfig.sol";

/**
 * @title RebalancerConfig
 * @notice System-wide configuration storage for Rebased platform
 * @dev Upgradeable contract using UUPS pattern
 */
contract RebalancerConfig is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    IRebalancerConfig
{
    /// @notice Contract version
    string public constant version = "1.0.0";

    /// @notice Maximum slippage in basis points (default: 50 = 0.5%)
    uint256 public maxSlippage;

    /// @notice Minimum rebalance interval in seconds (default: 60 seconds)
    uint256 public minRebalanceInterval;

    /// @notice Maximum allocation drift in basis points (default: 500 = 5%)
    uint256 public maxAllocationDrift;

    /// @notice Management fee in basis points (default: 50 = 0.5% annual)
    uint256 public managementFee;

    /// @notice Performance fee in basis points (default: 1000 = 10%)
    uint256 public performanceFee;

    /// @notice Fee recipient address
    address public feeRecipient;

    /// @notice Token whitelist
    mapping(address => bool) public whitelistedTokens;

    /// @notice Constant for basis points calculation
    uint256 private constant MAX_BPS = 10000;

    /**
     * @dev Storage gap for future upgrades
     * Reserves storage slots for future variables without shifting existing ones
     */
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract
     * @param _owner The contract owner
     */
    function initialize(address _owner) external initializer {
        require(_owner != address(0), "Invalid owner");

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        // Set default values
        maxSlippage = 50; // 0.5%
        minRebalanceInterval = 60; // 60 seconds
        maxAllocationDrift = 500; // 5%
        managementFee = 50; // 0.5% annual
        performanceFee = 1000; // 10%
        feeRecipient = _owner; // Owner receives fees by default
    }

    /**
     * @notice Get the contract version
     * @return Version string
     */
    function getVersion() external pure override returns (string memory) {
        return version;
    }

    /**
     * @notice Set maximum slippage in basis points
     * @param bps Basis points (e.g., 50 = 0.5%)
     */
    function setMaxSlippage(uint256 bps) external override onlyOwner {
        require(bps <= 1000, "Slippage too high"); // Max 10%
        uint256 oldValue = maxSlippage;
        maxSlippage = bps;
        emit MaxSlippageUpdated(oldValue, bps);
    }

    /**
     * @notice Set minimum rebalance interval in seconds
     * @param seconds_ Minimum seconds between rebalances
     */
    function setMinRebalanceInterval(uint256 seconds_) external override onlyOwner {
        require(seconds_ > 0, "Must be greater than 0");
        uint256 oldValue = minRebalanceInterval;
        minRebalanceInterval = seconds_;
        emit MinRebalanceIntervalUpdated(oldValue, seconds_);
    }

    /**
     * @notice Set maximum allocation drift in basis points
     * @param bps Basis points (e.g., 500 = 5%)
     */
    function setMaxAllocationDrift(uint256 bps) external override onlyOwner {
        require(bps <= MAX_BPS, "Exceeds 100%");
        uint256 oldValue = maxAllocationDrift;
        maxAllocationDrift = bps;
        emit MaxAllocationDriftUpdated(oldValue, bps);
    }

    /**
     * @notice Set management fee in basis points (annual)
     * @param bps Basis points (e.g., 50 = 0.5% annual)
     */
    function setManagementFee(uint256 bps) external override onlyOwner {
        require(bps <= MAX_BPS, "Exceeds 100%");
        uint256 oldValue = managementFee;
        managementFee = bps;
        emit ManagementFeeUpdated(oldValue, bps);
    }

    /**
     * @notice Set performance fee in basis points
     * @param bps Basis points (e.g., 1000 = 10%)
     */
    function setPerformanceFee(uint256 bps) external override onlyOwner {
        require(bps <= MAX_BPS, "Exceeds 100%");
        uint256 oldValue = performanceFee;
        performanceFee = bps;
        emit PerformanceFeeUpdated(oldValue, bps);
    }

    /**
     * @notice Set fee recipient address
     * @param recipient The address to receive fees
     */
    function setFeeRecipient(address recipient) external override onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = recipient;
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }

    /**
     * @notice Add a token to the whitelist
     * @param token The token address to whitelist
     */
    function addWhitelistedToken(address token) external override onlyOwner {
        require(token != address(0), "Invalid token");
        require(!whitelistedTokens[token], "Already whitelisted");
        whitelistedTokens[token] = true;
        emit TokenWhitelisted(token);
    }

    /**
     * @notice Remove a token from the whitelist
     * @param token The token address to remove
     */
    function removeWhitelistedToken(address token) external override onlyOwner {
        require(whitelistedTokens[token], "Not whitelisted");
        whitelistedTokens[token] = false;
        emit TokenRemovedFromWhitelist(token);
    }

    /**
     * @notice Check if a token is whitelisted
     * @param token The token address to check
     * @return true if the token is whitelisted
     */
    function isTokenWhitelisted(address token) external view override returns (bool) {
        return whitelistedTokens[token];
    }

    /**
     * @notice Get maximum slippage in basis points
     * @return Basis points
     */
    function getMaxSlippage() external view override returns (uint256) {
        return maxSlippage;
    }

    /**
     * @notice Get minimum rebalance interval in seconds
     * @return Seconds
     */
    function getMinRebalanceInterval() external view override returns (uint256) {
        return minRebalanceInterval;
    }

    /**
     * @notice Get maximum allocation drift in basis points
     * @return Basis points
     */
    function getMaxAllocationDrift() external view override returns (uint256) {
        return maxAllocationDrift;
    }

    /**
     * @notice Get management fee in basis points
     * @return Basis points
     */
    function getManagementFee() external view override returns (uint256) {
        return managementFee;
    }

    /**
     * @notice Get performance fee in basis points
     * @return Basis points
     */
    function getPerformanceFee() external view override returns (uint256) {
        return performanceFee;
    }

    /**
     * @notice Get fee recipient address
     * @return The fee recipient address
     */
    function getFeeRecipient() external view override returns (address) {
        return feeRecipient;
    }

    /**
     * @notice Authorize upgrade (UUPS requirement)
     * @param newImplementation The new implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
