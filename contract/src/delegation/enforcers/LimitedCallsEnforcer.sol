// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LimitedCallsEnforcer
 * @notice Caveat enforcer that limits number of calls within a time period
 * @dev Implements rate limiting for delegations
 *
 * Use Case: Allow max 10 rebalances per day
 *
 * Terms Format: abi.encode(uint256 maxCalls, uint256 period)
 * Example: abi.encode(10, 86400) // 10 calls per 24 hours
 *
 * Args Format: abi.encode(bytes32 delegationHash)
 * - delegationHash uniquely identifies the delegation for tracking
 *
 * Compatible with MetaMask Delegation Framework
 */
contract LimitedCallsEnforcer {
    error RateLimitExceeded(uint256 maxCalls, uint256 period);

    /**
     * @notice Tracking structure for rate limiting
     * @param count Number of calls in current period
     * @param periodStart Timestamp when current period started
     */
    struct RateLimit {
        uint256 count;
        uint256 periodStart;
    }

    /// @notice Mapping: delegationHash => RateLimit
    mapping(bytes32 => RateLimit) public rateLimits;

    /**
     * @notice Enforce before execution - check and update rate limit
     * @param terms Encoded rate limit: (maxCalls, period)
     * @param args Encoded delegation hash for tracking
     * @param executionCallData Calldata being executed
     * @param redeemer Address redeeming the delegation
     * @param delegator Address that granted the delegation
     */
    function beforeHook(
        bytes calldata terms,
        bytes calldata args,
        bytes calldata executionCallData,
        address redeemer,
        address delegator
    ) external {
        // Decode rate limit parameters from terms
        (uint256 maxCalls, uint256 period) = abi.decode(terms, (uint256, uint256));

        // Decode delegation hash from args
        bytes32 delegationHash = abi.decode(args, (bytes32));

        // Get current rate limit state
        RateLimit storage limit = rateLimits[delegationHash];

        // Check if we're in a new period
        if (block.timestamp >= limit.periodStart + period) {
            // Reset counter for new period
            limit.periodStart = block.timestamp;
            limit.count = 0;
        }

        // Check if limit exceeded
        if (limit.count >= maxCalls) {
            revert RateLimitExceeded(maxCalls, period);
        }

        // Increment counter
        limit.count++;
    }

    /**
     * @notice After hook - no action needed for rate limiting
     * @dev Rate limit counter already incremented in beforeHook
     */
    function afterHook(
        bytes calldata terms,
        bytes calldata args,
        bytes calldata executionCallData,
        address redeemer,
        address delegator
    ) external pure {
        // No action needed after execution
    }

    /**
     * @notice Get current rate limit state for a delegation
     * @param delegationHash Hash of the delegation to query
     * @return count Current call count in period
     * @return periodStart When current period started
     */
    function getRateLimit(bytes32 delegationHash) external view returns (uint256 count, uint256 periodStart) {
        RateLimit memory limit = rateLimits[delegationHash];
        return (limit.count, limit.periodStart);
    }
}
