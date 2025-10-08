// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimestampEnforcer
 * @notice Caveat enforcer that restricts delegations to specific time windows
 * @dev Ensures delegation can only be used within validAfter and validBefore timestamps
 *
 * Use Case: Grant temporary delegation (e.g., valid for 30 days)
 *
 * Terms Format: abi.encode(uint256 validAfter, uint256 validBefore)
 * Example: abi.encode(block.timestamp, block.timestamp + 30 days)
 *
 * Compatible with MetaMask Delegation Framework
 */
contract TimestampEnforcer {
    error DelegationNotYetValid(uint256 validAfter, uint256 currentTime);
    error DelegationExpired(uint256 validBefore, uint256 currentTime);

    /**
     * @notice Enforce before execution - check timestamp is within valid window
     * @param terms Encoded timestamps: (validAfter, validBefore)
     * @param args Runtime arguments (unused)
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
    ) external view {
        // Decode timestamp bounds from terms
        (uint256 validAfter, uint256 validBefore) = abi.decode(terms, (uint256, uint256));

        // Check delegation is not used before validAfter
        if (block.timestamp < validAfter) {
            revert DelegationNotYetValid(validAfter, block.timestamp);
        }

        // Check delegation is not used after validBefore
        if (block.timestamp > validBefore) {
            revert DelegationExpired(validBefore, block.timestamp);
        }
    }

    /**
     * @notice After hook - no action needed for timestamp restriction
     * @dev Timestamp restriction is enforced before execution
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
}
