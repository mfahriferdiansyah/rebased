// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { PackedUserOperation } from "@account-abstraction/interfaces/PackedUserOperation.sol";

/**
 * @title IAccount
 * @notice ERC-4337 Account interface for smart contract accounts
 * @dev Implements minimal interface required by Entry Point v0.7
 *
 * Entry Point calls validateUserOp() before executing the user operation.
 * The account must verify the signature and pay for the operation.
 */
interface IAccount {
    /**
     * @notice Validate user operation signature and pay for execution
     * @dev Called by EntryPoint during UserOperation validation phase
     *
     * @param userOp The operation being validated
     * @param userOpHash Hash of the user operation (for signature verification)
     * @param missingAccountFunds Amount of native tokens to pay to Entry Point
     * @return validationData Packed validation result:
     *         - SIG_VALIDATION_SUCCESS (0) if signature is valid
     *         - SIG_VALIDATION_FAILED (1) if signature is invalid
     *         - Or packed: <validAfter> <validUntil> <authorizer>
     *
     * MUST verify the signature and increment nonce
     * MUST pay missingAccountFunds to EntryPoint if > 0
     * MAY revert if validation fails
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}

/**
 * @title IEntryPoint
 * @notice Minimal Entry Point interface for ERC-4337
 * @dev Accounts call this to deposit gas funds and get nonce
 */
interface IEntryPoint {
    /**
     * @notice Get next nonce for sender
     * @param sender Account address
     * @param key Nonce key (for parallel nonces)
     * @return nonce Next nonce value
     */
    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);

    /**
     * @notice Deposit native tokens to pay for gas
     * @param account Account to credit
     */
    function depositTo(address account) external payable;

    /**
     * @notice Get deposited balance
     * @param account Account to query
     * @return balance Deposited balance
     */
    function balanceOf(address account) external view returns (uint256);
}
