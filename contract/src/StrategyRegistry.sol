// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./libraries/StrategyLibrary.sol";

/**
 * @title StrategyRegistry
 * @notice Shared registry for all user strategies (non-custodial)
 * @dev Users create strategies here, funds stay in their MetaMask accounts
 *
 * Architecture:
 * - ONE shared registry for ALL users
 * - Each user can have MULTIPLE strategies
 * - Data isolated by mapping: user address => strategy ID => strategy
 * - No custody: funds never leave user's MetaMask account
 */
contract StrategyRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using StrategyLibrary for StrategyLibrary.Strategy;

    /// @notice User => Strategy ID => Strategy
    mapping(address => mapping(uint256 => StrategyLibrary.Strategy)) public strategies;

    /// @notice User => Array of strategy IDs
    mapping(address => uint256[]) public userStrategyIds;

    /// @notice User => Strategy count
    mapping(address => uint256) public userStrategyCount;

    /// @notice Address allowed to update lastRebalanceTime (RebalanceExecutor)
    address public rebalanceExecutor;

    // Events
    event StrategyCreated(
        address indexed user, uint256 indexed strategyId, string name, address[] tokens, uint256[] weights
    );
    event StrategyUpdated(address indexed user, uint256 indexed strategyId, address[] tokens, uint256[] weights);
    event StrategyPaused(address indexed user, uint256 indexed strategyId);
    event StrategyResumed(address indexed user, uint256 indexed strategyId);
    event StrategyDeleted(address indexed user, uint256 indexed strategyId);
    event RebalanceExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event LastRebalanceTimeUpdated(address indexed user, uint256 indexed strategyId, uint256 timestamp);

    // Errors
    error StrategyAlreadyExists();
    error StrategyNotFound();
    error InvalidStrategyId();
    error OnlyStrategyOwner();
    error OnlyRebalanceExecutor();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the registry
     * @param _owner Owner address
     */
    function initialize(address _owner) external initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    /**
     * @notice Set rebalance executor address (only owner)
     * @param _executor RebalanceExecutor contract address
     */
    function setRebalanceExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "Invalid executor");
        address oldExecutor = rebalanceExecutor;
        rebalanceExecutor = _executor;
        emit RebalanceExecutorUpdated(oldExecutor, _executor);
    }

    /**
     * @notice Create a new strategy
     * @param strategyId Unique ID for this strategy (user-defined)
     * @param tokens Token addresses in strategy
     * @param weights Token weights in basis points (must sum to 10000)
     * @param rebalanceInterval Minimum seconds between rebalances
     * @param name Human-readable name
     */
    function createStrategy(
        uint256 strategyId,
        address[] calldata tokens,
        uint256[] calldata weights,
        uint256 rebalanceInterval,
        string calldata name
    ) external {
        // Check strategy doesn't already exist
        if (strategies[msg.sender][strategyId].id != 0 || strategies[msg.sender][strategyId].tokens.length > 0) {
            revert StrategyAlreadyExists();
        }

        // Validate parameters
        StrategyLibrary.validateStrategy(tokens, weights);
        require(rebalanceInterval > 0, "Invalid interval");
        require(bytes(name).length > 0, "Invalid name");

        // Create strategy
        strategies[msg.sender][strategyId] = StrategyLibrary.Strategy({
            id: strategyId,
            tokens: tokens,
            weights: weights,
            rebalanceInterval: rebalanceInterval,
            lastRebalanceTime: block.timestamp,
            isActive: true,
            name: name
        });

        // Track strategy ID
        userStrategyIds[msg.sender].push(strategyId);
        userStrategyCount[msg.sender]++;

        emit StrategyCreated(msg.sender, strategyId, name, tokens, weights);
    }

    /**
     * @notice Update an existing strategy
     * @param strategyId Strategy ID to update
     * @param tokens New token addresses
     * @param weights New token weights
     */
    function updateStrategy(uint256 strategyId, address[] calldata tokens, uint256[] calldata weights) external {
        StrategyLibrary.Strategy storage strategy = strategies[msg.sender][strategyId];

        if (strategy.id == 0 && strategy.tokens.length == 0) {
            revert StrategyNotFound();
        }

        // Validate new parameters
        StrategyLibrary.validateStrategy(tokens, weights);

        // Update strategy
        strategy.tokens = tokens;
        strategy.weights = weights;

        emit StrategyUpdated(msg.sender, strategyId, tokens, weights);
    }

    /**
     * @notice Pause a strategy (stops rebalancing)
     * @param strategyId Strategy ID to pause
     */
    function pauseStrategy(uint256 strategyId) external {
        StrategyLibrary.Strategy storage strategy = strategies[msg.sender][strategyId];

        if (strategy.id == 0 && strategy.tokens.length == 0) {
            revert StrategyNotFound();
        }

        strategy.isActive = false;

        emit StrategyPaused(msg.sender, strategyId);
    }

    /**
     * @notice Resume a paused strategy
     * @param strategyId Strategy ID to resume
     */
    function resumeStrategy(uint256 strategyId) external {
        StrategyLibrary.Strategy storage strategy = strategies[msg.sender][strategyId];

        if (strategy.id == 0 && strategy.tokens.length == 0) {
            revert StrategyNotFound();
        }

        strategy.isActive = true;

        emit StrategyResumed(msg.sender, strategyId);
    }

    /**
     * @notice Delete a strategy
     * @param strategyId Strategy ID to delete
     */
    function deleteStrategy(uint256 strategyId) external {
        StrategyLibrary.Strategy storage strategy = strategies[msg.sender][strategyId];

        if (strategy.id == 0 && strategy.tokens.length == 0) {
            revert StrategyNotFound();
        }

        // Delete strategy
        delete strategies[msg.sender][strategyId];

        // Remove from ID array
        uint256[] storage ids = userStrategyIds[msg.sender];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == strategyId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }

        userStrategyCount[msg.sender]--;

        emit StrategyDeleted(msg.sender, strategyId);
    }

    /**
     * @notice Update last rebalance time (only callable by RebalanceExecutor)
     * @param user User address
     * @param strategyId Strategy ID
     */
    function updateLastRebalanceTime(address user, uint256 strategyId) external {
        if (msg.sender != rebalanceExecutor) {
            revert OnlyRebalanceExecutor();
        }

        StrategyLibrary.Strategy storage strategy = strategies[user][strategyId];

        if (strategy.id == 0 && strategy.tokens.length == 0) {
            revert StrategyNotFound();
        }

        strategy.lastRebalanceTime = block.timestamp;

        emit LastRebalanceTimeUpdated(user, strategyId, block.timestamp);
    }

    /**
     * @notice Get a specific strategy
     * @param user User address
     * @param strategyId Strategy ID
     * @return strategy Strategy data
     */
    function getStrategy(address user, uint256 strategyId)
        external
        view
        returns (StrategyLibrary.Strategy memory strategy)
    {
        return strategies[user][strategyId];
    }

    /**
     * @notice Get all strategy IDs for a user
     * @param user User address
     * @return Strategy IDs
     */
    function getUserStrategyIds(address user) external view returns (uint256[] memory) {
        return userStrategyIds[user];
    }

    /**
     * @notice Get strategy count for a user
     * @param user User address
     * @return count Number of strategies
     */
    function getUserStrategyCount(address user) external view returns (uint256 count) {
        return userStrategyCount[user];
    }

    /**
     * @notice Get all strategies for a user
     * @param user User address
     * @return Array of strategies
     */
    function getAllUserStrategies(address user) external view returns (StrategyLibrary.Strategy[] memory) {
        uint256[] memory ids = userStrategyIds[user];
        StrategyLibrary.Strategy[] memory userStrategies = new StrategyLibrary.Strategy[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            userStrategies[i] = strategies[user][ids[i]];
        }

        return userStrategies;
    }

    /**
     * @notice Authorize upgrade (UUPS requirement)
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Get contract version
     * @return Version string
     */
    function getVersion() external pure returns (string memory) {
        return "1.0.0";
    }
}
