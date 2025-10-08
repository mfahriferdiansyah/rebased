// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AllowedMethodsEnforcer
 * @notice Caveat enforcer that restricts delegations to specific function selectors
 * @dev Prevents delegates from calling unauthorized functions
 *
 * Use Case: Allow delegate to call only rebalance() but not withdraw() or other sensitive functions
 *
 * Terms Format: abi.encode(bytes4[] allowedSelectors)
 * Example: abi.encode([bytes4(keccak256("rebalance()"))])
 *
 * Compatible with MetaMask Delegation Framework
 */
contract AllowedMethodsEnforcer {
    error MethodNotAllowed(bytes4 selector);

    /**
     * @notice Enforce before execution - check if method is allowed
     * @param terms Encoded array of allowed function selectors
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
        // Decode allowed selectors from terms
        bytes4[] memory allowedSelectors = abi.decode(terms, (bytes4[]));

        // Extract function selector from calldata (first 4 bytes)
        require(executionCallData.length >= 4, "Invalid calldata");
        bytes4 selector = bytes4(executionCallData[0:4]);

        // Check if selector is in allowed list
        bool isAllowed = false;
        for (uint256 i = 0; i < allowedSelectors.length; i++) {
            if (allowedSelectors[i] == selector) {
                isAllowed = true;
                break;
            }
        }

        if (!isAllowed) {
            revert MethodNotAllowed(selector);
        }
    }

    /**
     * @notice After hook - no action needed for method restriction
     * @dev Method restriction is enforced before execution
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
