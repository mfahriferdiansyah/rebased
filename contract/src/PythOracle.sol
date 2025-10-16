// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./interfaces/IPythOracle.sol";

/**
 * @title PythOracle
 * @notice Wrapper for Pyth Network price feeds with validation and batch queries
 * @dev Upgradeable contract using UUPS pattern
 *
 * Key Features:
 * - Confidence interval validation (rejects uncertain prices)
 * - Automatic staleness check via getPriceNoOlderThan()
 * - Handles dynamic exponents (Pyth uses price * 10^expo format)
 * - Scales all prices to 18 decimals for consistency
 */
contract PythOracle is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    IPythOracle
{
    /// @notice Contract version
    string public constant version = "1.0.0";

    /// @notice Pyth oracle contract address
    IPyth private _pythContract;

    /// @notice Maximum age for price data in seconds (default: 60 seconds)
    uint256 public maxPriceAge;

    /// @notice Maximum confidence ratio in basis points (default: 500 = 5%)
    /// @dev Confidence ratio = (conf / price) * 10000
    uint256 public maxConfidenceRatio;

    /// @notice Mapping of token address to Pyth price feed ID
    mapping(address => bytes32) public priceFeeds;

    /// @notice Mapping of stablecoin addresses (returns $1 if Pyth feed unavailable)
    mapping(address => bool) public stablecoins;

    /// @notice Constant for 18 decimal scaling
    uint256 private constant DECIMALS_18 = 18;

    /// @notice Maximum safe exponent for scaling (10^30 < type(uint256).max)
    uint256 private constant MAX_SCALE_EXPONENT = 30;

    /// @notice Minimum confidence ratio in basis points (0.1% = 10 bps)
    uint256 private constant MIN_CONFIDENCE_RATIO = 10;

    /// @notice Maximum confidence ratio in basis points (10% = 1000 bps)
    uint256 private constant MAX_CONFIDENCE_RATIO = 1000;

    // Custom Errors
    error PriceScaleUnderflow();
    error PriceScaleOverflow();
    error PriceCalculationOverflow();

    /**
     * @dev Storage gap for future upgrades
     * Reduced to 47 to account for new storage variables
     */
    uint256[47] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract
     * @param _owner The contract owner
     * @param pythContract_ The Pyth oracle contract address
     */
    function initialize(address _owner, address pythContract_) external initializer {
        require(_owner != address(0), "Invalid owner");
        require(pythContract_ != address(0), "Invalid Pyth contract");

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        _pythContract = IPyth(pythContract_);
        maxPriceAge = 60; // 60 seconds default
        // HIGH-001 FIX: Reduced from 500 bps (5%) to 100 bps (1%) for better security
        maxConfidenceRatio = 100; // 1% default (industry standard)
    }

    /**
     * @notice Get the contract version
     * @return Version string
     */
    function getVersion() external pure override returns (string memory) {
        return version;
    }

    /**
     * @notice Set a price feed for a token
     * @param token The token address
     * @param feedId The Pyth price feed ID (bytes32)
     */
    function setPriceFeed(address token, bytes32 feedId) external override onlyOwner {
        require(token != address(0), "Invalid token");
        require(feedId != bytes32(0), "Invalid feed ID");

        // HIGH-006 FIX: Validate feed ID works and returns reasonable price
        // Use 1 hour staleness to allow setting feeds even if recently deployed
        try _pythContract.getPriceNoOlderThan(feedId, 3600) returns (PythStructs.Price memory price) {
            require(price.price > 0, "Invalid feed - zero price");

            // If replacing existing feed, sanity check new price vs old price
            if (priceFeeds[token] != bytes32(0)) {
                // Get old price for comparison
                try this.getPrice(token) returns (uint256 oldPrice) {
                    // Calculate new price in same format (18 decimals)
                    uint256 newPrice = _scaleToDecimals(price, 18);

                    // Calculate percentage difference
                    uint256 priceDiff = oldPrice > newPrice ? oldPrice - newPrice : newPrice - oldPrice;
                    uint256 diffPercent = (priceDiff * 100) / oldPrice;

                    // Require new price within 50% of old price (sanity check)
                    require(diffPercent <= 50, "Price differs by >50%");
                } catch {
                    // If old price fetch fails, allow the update
                    // This can happen if old feed is stale
                }
            }
        } catch {
            revert("Feed ID validation failed");
        }

        priceFeeds[token] = feedId;
        emit PriceFeedSet(token, feedId);
    }

    /**
     * @notice Remove a price feed for a token
     * @param token The token address
     */
    function removePriceFeed(address token) external override onlyOwner {
        require(priceFeeds[token] != bytes32(0), "No feed configured");

        delete priceFeeds[token];
        emit PriceFeedRemoved(token);
    }

    /**
     * @notice Register a token as a stablecoin (returns $1 if Pyth feed unavailable)
     * @param token The token address
     * @param isStablecoin True if token is a stablecoin
     */
    function setStablecoin(address token, bool isStablecoin) external onlyOwner {
        require(token != address(0), "Invalid token");
        stablecoins[token] = isStablecoin;
    }

    /**
     * @notice Get the latest price for a token (scaled to 18 decimals)
     * @param token The token address
     * @return price The price scaled to 18 decimals
     */
    function getPrice(address token) external view override returns (uint256 price) {
        try this._getPythPriceExternal(token) returns (PythStructs.Price memory pythPrice) {
            // Validate confidence
            _validateConfidence(pythPrice, token);

            // Scale to 18 decimals
            price = _scaleToDecimals(pythPrice, DECIMALS_18);
        } catch {
            // If Pyth feed fails and token is a stablecoin, return $1
            if (stablecoins[token]) {
                return 10 ** DECIMALS_18; // $1 scaled to 18 decimals
            }
            // Otherwise, revert with original error
            revert NoFeedConfigured(token);
        }
    }

    /**
     * @notice External wrapper for _getPythPrice (needed for try-catch)
     * @param token The token address
     * @return pythPrice The Pyth price struct
     */
    function _getPythPriceExternal(address token) external view returns (PythStructs.Price memory) {
        return _getPythPrice(token);
    }

    /**
     * @notice Get prices for multiple tokens
     * @param tokens Array of token addresses
     * @return prices Array of prices (scaled to 18 decimals)
     */
    function batchGetPrices(address[] calldata tokens)
        external
        view
        override
        returns (uint256[] memory prices)
    {
        prices = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            try this._getPythPriceExternal(tokens[i]) returns (PythStructs.Price memory pythPrice) {
                _validateConfidence(pythPrice, tokens[i]);
                prices[i] = _scaleToDecimals(pythPrice, DECIMALS_18);
            } catch {
                // If Pyth feed fails and token is a stablecoin, return $1
                if (stablecoins[tokens[i]]) {
                    prices[i] = 10 ** DECIMALS_18;
                } else {
                    revert NoFeedConfigured(tokens[i]);
                }
            }
        }
    }

    /**
     * @notice Check if a price is fresh (within maxPriceAge)
     * @param token The token address
     * @return true if the price is fresh
     */
    function isPriceFresh(address token) external view override returns (bool) {
        bytes32 feedId = priceFeeds[token];
        if (feedId == bytes32(0)) {
            return false;
        }

        try _pythContract.getPriceNoOlderThan(feedId, maxPriceAge) returns (PythStructs.Price memory) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @notice Set the maximum price age
     * @param seconds_ Maximum age of price data in seconds
     */
    function setMaxPriceAge(uint256 seconds_) external override onlyOwner {
        require(seconds_ > 0 && seconds_ <= 3600, "Invalid age"); // Max 1 hour
        uint256 oldValue = maxPriceAge;
        maxPriceAge = seconds_;
        emit MaxPriceAgeUpdated(oldValue, seconds_);
    }

    /**
     * @notice Set the maximum confidence ratio
     * @param bps Maximum confidence ratio in basis points (e.g., 500 = 5%)
     */
    function setMaxConfidenceRatio(uint256 bps) external override onlyOwner {
        // HIGH-001 FIX: Add minimum bound and reduce maximum
        require(bps >= MIN_CONFIDENCE_RATIO, "Confidence ratio too low");
        require(bps <= MAX_CONFIDENCE_RATIO, "Confidence ratio too high");
        uint256 oldValue = maxConfidenceRatio;
        maxConfidenceRatio = bps;
        emit MaxConfidenceRatioUpdated(oldValue, bps);
    }

    /**
     * @notice Get the Pyth contract address
     * @return The Pyth contract address
     */
    function getPythContract() external view override returns (address) {
        return address(_pythContract);
    }

    /**
     * @notice Get the Pyth contract address (storage variable getter)
     * @return The Pyth contract address
     */
    function pythContract() external view override returns (address) {
        return address(_pythContract);
    }

    /**
     * @notice Alias for getPythContract (compatibility)
     */
    function oracle() external view override returns (address) {
        return address(_pythContract);
    }

    /**
     * @notice Internal function to get Pyth price
     * @param token The token address
     * @return pythPrice The Pyth price struct
     */
    function _getPythPrice(address token) internal view returns (PythStructs.Price memory) {
        bytes32 feedId = priceFeeds[token];
        if (feedId == bytes32(0)) {
            revert NoFeedConfigured(token);
        }

        // getPriceNoOlderThan reverts if price is stale
        PythStructs.Price memory pythPrice = _pythContract.getPriceNoOlderThan(feedId, maxPriceAge);

        // Validate price is positive
        if (pythPrice.price <= 0) {
            revert InvalidPrice(token, pythPrice.price);
        }

        return pythPrice;
    }

    /**
     * @notice Validate confidence interval
     * @param pythPrice The Pyth price struct
     */
    function _validateConfidence(PythStructs.Price memory pythPrice, address /* token */) internal view {
        // CRITICAL-002 FIX: Defensive check for zero price
        // This should never trigger if _getPythPrice validates correctly,
        // but defensive programming prevents division by zero in critical path
        require(pythPrice.price > 0, "Price must be positive");

        // Calculate confidence ratio: (conf / price) * 10000
        // Safe to divide now that we've validated price > 0
        uint256 confidenceRatio = (uint256(pythPrice.conf) * 10000) / uint256(uint64(pythPrice.price));

        if (confidenceRatio > maxConfidenceRatio) {
            revert ConfidenceTooLow(pythPrice.conf, uint64(pythPrice.price), confidenceRatio);
        }
    }

    /**
     * @notice Scale Pyth price to target decimals
     * @param pythPrice The Pyth price struct
     * @param targetDecimals Target decimal places (usually 18)
     * @return scaled The scaled price
     *
     * @dev Pyth price format: price * 10^expo
     * Example: price=200000000000, expo=-8 → actual price = 2000.00
     * To scale to 18 decimals: multiply by 10^(18-(-8)) = 10^26? NO!
     *
     * Correct logic:
     * - Pyth gives: mantissa=200000000000, expo=-8
     * - Actual value: 200000000000 * 10^(-8) = 2000
     * - Target: 2000 * 10^18 = 2000000000000000000000
     * - Formula: mantissa * 10^(targetDecimals + expo)
     * - Check: 200000000000 * 10^(18 + (-8)) = 200000000000 * 10^10 ✅
     */
    function _scaleToDecimals(PythStructs.Price memory pythPrice, uint256 targetDecimals)
        internal
        pure
        returns (uint256)
    {
        // Calculate scaling exponent: targetDecimals + expo (expo is negative usually)
        int256 scaleExpo = int256(targetDecimals) + int256(pythPrice.expo);

        // Check for underflow (negative exponent after scaling)
        if (scaleExpo < 0) {
            revert PriceScaleUnderflow();
        }

        // CRITICAL-001 FIX: Check maximum exponent to prevent overflow
        // 10^30 is safe, 10^77 is theoretical max, but we use conservative limit
        if (scaleExpo > int256(MAX_SCALE_EXPONENT)) {
            revert PriceScaleOverflow();
        }

        // Convert price to uint256 (safe because we validated positive in _getPythPrice)
        uint256 priceUint = uint256(uint64(pythPrice.price));
        uint256 scaleFactor = 10 ** uint256(scaleExpo);

        // CRITICAL-001 FIX: Check multiplication overflow before computing
        // Even with Solidity 0.8+, this is defensive programming for critical path
        if (priceUint > type(uint256).max / scaleFactor) {
            revert PriceCalculationOverflow();
        }

        // Safe to multiply now
        return priceUint * scaleFactor;
    }

    /**
     * @notice Authorize upgrade (UUPS requirement)
     * @param newImplementation The new implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
