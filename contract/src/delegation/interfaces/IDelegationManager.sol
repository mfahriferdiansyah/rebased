// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../types/DelegationTypes.sol";

/**
 * @title IDelegationManager
 * @notice Interface for ERC-7710 compliant Delegation Manager
 * @dev Validates and executes delegations with caveat enforcement
 *
 * Compatible with MetaMask Delegation Framework
 */
interface IDelegationManager {
    // Events

    /**
     * @notice Emitted when a delegation is successfully redeemed
     * @param delegationHash Hash of the redeemed delegation
     * @param delegator Address that granted the delegation
     * @param redeemer Address that redeemed the delegation
     * @param target Contract called during redemption
     */
    event DelegationRedeemed(
        bytes32 indexed delegationHash, address indexed delegator, address indexed redeemer, address target
    );

    /**
     * @notice Emitted when a delegation is revoked
     * @param delegationHash Hash of the revoked delegation
     * @param delegator Address that revoked the delegation
     */
    event DelegationRevoked(bytes32 indexed delegationHash, address indexed delegator);

    // Errors

    error InvalidDelegation();
    error InvalidSignature();
    error DelegationExpired();
    error DelegationAlreadyRevoked();
    error CaveatEnforcementFailed();
    error UnauthorizedRedeemer();

    // Main Functions

    /**
     * @notice Redeem one or more delegations to execute actions
     * @dev Main entry point for ERC-7710 delegation redemption
     * @param permissionContexts Array of encoded delegations
     * @param modes Execution modes for each delegation
     * @param executionCallDatas Calldata to execute for each delegation
     *
     * Flow:
     * 1. Decode delegations from permissionContexts
     * 2. Validate each delegation (signature, authority chain)
     * 3. Enforce caveats (beforeHook → execute → afterHook)
     * 4. Execute the action on target contract
     * 5. Emit DelegationRedeemed event
     */
    function redeemDelegations(
        bytes[] calldata permissionContexts,
        bytes32[] calldata modes,
        bytes[] calldata executionCallDatas
    ) external;

    /**
     * @notice Revoke a delegation (can only be called by delegator)
     * @param delegation Delegation to revoke
     */
    function revokeDelegation(DelegationTypes.Delegation calldata delegation) external;

    /**
     * @notice Check if a delegation is valid and not revoked
     * @param delegation Delegation to check
     * @return isValid True if delegation is valid and active
     */
    function isDelegationValid(DelegationTypes.Delegation calldata delegation) external view returns (bool);

    /**
     * @notice Check if an address has valid delegation authority for a target
     * @param delegate Address to check
     * @param delegator Delegator address
     * @return hasAuthority True if delegate has active delegation from delegator
     */
    function isDelegateFor(address delegate, address delegator) external view returns (bool);

    /**
     * @notice Get the EIP-712 domain separator
     * @return Domain separator for this contract
     */
    function getDomainSeparator() external view returns (bytes32);

    /**
     * @notice Compute delegation hash
     * @param delegation Delegation to hash
     * @return Hash of the delegation
     */
    function getDelegationHash(DelegationTypes.Delegation calldata delegation) external pure returns (bytes32);

    /**
     * @notice Check if a delegation has been revoked
     * @param delegationHash Hash of delegation to check
     * @return isRevoked True if delegation is revoked
     */
    function isRevoked(bytes32 delegationHash) external view returns (bool);
}
