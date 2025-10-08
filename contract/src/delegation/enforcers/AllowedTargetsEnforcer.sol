// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AllowedTargetsEnforcer
 * @notice Caveat enforcer that restricts delegations to specific contract addresses
 * @dev Ensures delegate can only call whitelisted contracts (e.g., Uniswap Router only)
 *
 * Use Case: Prevent bot from calling withdraw() or transferring funds
 *
 * Terms Format: abi.encode(address[] allowedTargets)
 * Example: abi.encode([uniswapRouter, aavePool]) // Can only call these contracts
 *
 * Compatible with MetaMask Delegation Framework
 */
contract AllowedTargetsEnforcer {
    error TargetNotAllowed(address target, address[] allowedTargets);

    /**
     * @notice Enforce before execution - check target is allowed
     * @param terms Encoded array of allowed target addresses
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
    ) external pure {
        // Decode allowed targets from terms
        address[] memory allowedTargets = abi.decode(terms, (address[]));

        // Extract target address from executionCallData
        // executionCallData format: abi.encodeWithSelector(execute.selector, target, value, data)
        // Target is at bytes 16-35 (after 4 byte selector + 12 byte padding)
        address target;
        assembly {
            target := shr(96, calldataload(add(executionCallData.offset, 16)))
        }

        // Check if target is in allowlist
        bool isAllowed = false;
        for (uint256 i = 0; i < allowedTargets.length; i++) {
            if (allowedTargets[i] == target) {
                isAllowed = true;
                break;
            }
        }

        if (!isAllowed) {
            revert TargetNotAllowed(target, allowedTargets);
        }
    }

    /**
     * @notice After hook - no action needed
     * @dev Target restriction is enforced before execution
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
