// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NativeTokenPaymentEnforcer
 * @notice Caveat enforcer that handles native token (ETH) payment for gas
 * @dev Ensures delegate is compensated for gas costs when redeeming delegation
 *
 * Use Case: Delegate bot pays gas to execute rebalance, gets reimbursed from delegator
 *
 * Terms Format: abi.encode(uint256 maxPayment)
 * Example: abi.encode(0.01 ether) // Max 0.01 ETH payment per redemption
 *
 * Compatible with MetaMask Delegation Framework and ERC-4337 paymasters
 */
contract NativeTokenPaymentEnforcer {
    error PaymentExceedsMaximum(uint256 payment, uint256 maximum);
    error PaymentFailed();

    /**
     * @notice Enforce before execution - no validation needed
     * @dev Payment validation happens in afterHook where msg.value is accessible
     * @param terms Encoded maximum payment amount
     * @param args Runtime arguments (unused)
     * @param executionCallData Calldata being executed
     * @param redeemer Address redeeming the delegation (will receive payment)
     * @param delegator Address that granted the delegation (will pay)
     */
    function beforeHook(
        bytes calldata terms,
        bytes calldata args,
        bytes calldata executionCallData,
        address redeemer,
        address delegator
    ) external pure {
        // No validation needed before execution
        // Payment handling is done in afterHook
    }

    /**
     * @notice After hook - validate and transfer native token payment to redeemer
     * @dev Payment happens after successful execution to prevent abuse
     * @param terms Encoded maximum payment amount
     * @param args Runtime arguments (unused)
     * @param executionCallData Calldata that was executed
     * @param redeemer Address to receive payment
     * @param delegator Address that granted delegation
     */
    function afterHook(
        bytes calldata terms,
        bytes calldata args,
        bytes calldata executionCallData,
        address redeemer,
        address delegator
    ) external payable {
        // Decode maximum payment from terms
        uint256 maxPayment = abi.decode(terms, (uint256));

        // Validate payment amount doesn't exceed maximum
        if (msg.value > maxPayment) {
            revert PaymentExceedsMaximum(msg.value, maxPayment);
        }

        // Transfer native token to redeemer as gas reimbursement
        if (msg.value > 0) {
            (bool success,) = payable(redeemer).call{value: msg.value}("");
            if (!success) {
                revert PaymentFailed();
            }
        }
    }

    /**
     * @notice Allow contract to receive native tokens
     */
    receive() external payable {}
}
