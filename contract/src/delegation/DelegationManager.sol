// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IDelegationManager.sol";
import "./types/DelegationTypes.sol";

/**
 * @title DelegationManager
 * @notice ERC-7710 compliant delegation manager with caveat enforcement
 * @dev Validates and executes delegations with fine-grained access control
 *
 * Delegation Flow:
 * 1. User creates delegation off-chain with caveats
 * 2. User signs delegation with EIP-712
 * 3. Delegate calls redeemDelegations() with signed delegation
 * 4. DelegationManager validates signature and authority
 * 5. Caveats are enforced (beforeHook → execute → afterHook)
 * 6. Action is executed on target contract
 *
 * Compatible with MetaMask Delegation Framework
 */
contract DelegationManager is IDelegationManager {
    using ECDSA for bytes32;
    using DelegationTypes for *;

    /// @notice Contract name for EIP-712 domain
    string public constant name = "RebasedDelegationManager";

    /// @notice EIP-712 domain separator (computed once)
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice Mapping of delegation hash => revoked status
    mapping(bytes32 => bool) public revokedDelegations;

    /// @notice Mapping of (delegate => delegator => hasAuthority)
    mapping(address => mapping(address => bool)) private _delegateAuthority;

    /**
     * @notice Constructor - computes EIP-712 domain separator
     */
    constructor() {
        DOMAIN_SEPARATOR = DelegationTypes.getDomainSeparator(name, address(this));
    }

    /**
     * @notice Redeem one or more delegations to execute actions
     * @inheritdoc IDelegationManager
     */
    function redeemDelegations(
        bytes[] calldata permissionContexts,
        bytes32[] calldata modes,
        bytes[] calldata executionCallDatas
    ) external override {
        require(permissionContexts.length == modes.length, "Length mismatch");
        require(permissionContexts.length == executionCallDatas.length, "Length mismatch");

        for (uint256 i = 0; i < permissionContexts.length; i++) {
            _redeemSingleDelegation(permissionContexts[i], modes[i], executionCallDatas[i]);
        }
    }

    /**
     * @notice Revoke a delegation (only delegator can revoke)
     * @inheritdoc IDelegationManager
     */
    function revokeDelegation(DelegationTypes.Delegation calldata delegation) external override {
        require(msg.sender == delegation.delegator, "Not delegator");

        bytes32 delegationHash = DelegationTypes.hashDelegation(delegation);
        require(!revokedDelegations[delegationHash], "Already revoked");

        revokedDelegations[delegationHash] = true;
        _delegateAuthority[delegation.delegate][delegation.delegator] = false;

        emit DelegationRevoked(delegationHash, delegation.delegator);
    }

    /**
     * @notice Check if delegation is valid and active
     * @inheritdoc IDelegationManager
     */
    function isDelegationValid(DelegationTypes.Delegation calldata delegation) external view override returns (bool) {
        bytes32 delegationHash = DelegationTypes.hashDelegation(delegation);

        // Check not revoked
        if (revokedDelegations[delegationHash]) {
            return false;
        }

        // Verify signature
        bytes32 messageHash = DelegationTypes.getMessageHash(delegation, DOMAIN_SEPARATOR);
        address signer = messageHash.recover(delegation.signature);

        return signer == delegation.delegator;
    }

    /**
     * @notice Check if delegate has authority for delegator
     * @inheritdoc IDelegationManager
     */
    function isDelegateFor(address delegate, address delegator) external view override returns (bool) {
        return _delegateAuthority[delegate][delegator];
    }

    /**
     * @notice Get EIP-712 domain separator
     * @inheritdoc IDelegationManager
     */
    function getDomainSeparator() external view override returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    /**
     * @notice Compute delegation hash
     * @inheritdoc IDelegationManager
     */
    function getDelegationHash(DelegationTypes.Delegation calldata delegation)
        external
        pure
        override
        returns (bytes32)
    {
        return DelegationTypes.hashDelegation(delegation);
    }

    /**
     * @notice Check if delegation is revoked
     * @inheritdoc IDelegationManager
     */
    function isRevoked(bytes32 delegationHash) external view override returns (bool) {
        return revokedDelegations[delegationHash];
    }

    // Internal Functions

    /**
     * @notice Redeem a single delegation
     * @param permissionContext Encoded delegation
     * @param mode Execution mode
     * @param executionCallData Calldata to execute
     */
    function _redeemSingleDelegation(bytes calldata permissionContext, bytes32 mode, bytes calldata executionCallData)
        internal
    {
        // Decode delegation
        DelegationTypes.Delegation memory delegation = abi.decode(permissionContext, (DelegationTypes.Delegation));

        // Validate delegation
        _validateDelegation(delegation);

        // Extract execution details
        DelegationTypes.Execution memory execution = abi.decode(executionCallData, (DelegationTypes.Execution));

        // Enforce caveats (beforeHook)
        _enforceCaveatsBefore(delegation, execution);

        // Execute the action
        _execute(execution, mode);

        // Enforce caveats (afterHook)
        _enforceCaveatsAfter(delegation, execution);

        // Mark delegate as authorized
        _delegateAuthority[delegation.delegate][delegation.delegator] = true;

        // Emit event
        bytes32 delegationHash = DelegationTypes.hashDelegation(delegation);
        emit DelegationRedeemed(delegationHash, delegation.delegator, msg.sender, execution.target);
    }

    /**
     * @notice Validate delegation (signature, revocation, authority chain)
     * @param delegation Delegation to validate
     */
    function _validateDelegation(DelegationTypes.Delegation memory delegation) internal view {
        // 1. Check not revoked
        bytes32 delegationHash = DelegationTypes.hashDelegation(delegation);
        if (revokedDelegations[delegationHash]) {
            revert DelegationAlreadyRevoked();
        }

        // 2. Verify EIP-712 signature
        bytes32 messageHash = DelegationTypes.getMessageHash(delegation, DOMAIN_SEPARATOR);
        address signer = messageHash.recover(delegation.signature);

        if (signer != delegation.delegator) {
            revert InvalidSignature();
        }

        // 3. Validate authority chain (if not root delegation)
        if (delegation.authority != bytes32(0)) {
            // For root delegations, authority is 0x0
            // For chained delegations, verify parent delegation exists and is valid
            // Note: This is simplified - full implementation would recursively validate chain
            // For MVP, we only support root delegations
            revert InvalidDelegation();
        }

        // 4. Check delegate is authorized to redeem
        if (msg.sender != delegation.delegate) {
            revert UnauthorizedRedeemer();
        }
    }

    /**
     * @notice Enforce caveats before execution
     * @param delegation Delegation with caveats
     * @param execution Execution to perform
     */
    function _enforceCaveatsBefore(DelegationTypes.Delegation memory delegation, DelegationTypes.Execution memory execution)
        internal
    {
        for (uint256 i = 0; i < delegation.caveats.length; i++) {
            DelegationTypes.Caveat memory caveat = delegation.caveats[i];

            // Call beforeHook on caveat enforcer
            (bool success, bytes memory returnData) = caveat.enforcer.call(
                abi.encodeWithSignature(
                    "beforeHook(bytes,bytes,bytes,address,address)",
                    caveat.terms,
                    caveat.args,
                    execution.callData,
                    msg.sender,
                    delegation.delegator
                )
            );

            if (!success) {
                // Revert with enforcer's error message
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
        }
    }

    /**
     * @notice Enforce caveats after execution
     * @param delegation Delegation with caveats
     * @param execution Execution that was performed
     */
    function _enforceCaveatsAfter(DelegationTypes.Delegation memory delegation, DelegationTypes.Execution memory execution)
        internal
    {
        // Reverse order for afterHook (root to leaf)
        for (uint256 i = delegation.caveats.length; i > 0; i--) {
            DelegationTypes.Caveat memory caveat = delegation.caveats[i - 1];

            // Call afterHook on caveat enforcer
            (bool success, bytes memory returnData) = caveat.enforcer.call(
                abi.encodeWithSignature(
                    "afterHook(bytes,bytes,bytes,address,address)",
                    caveat.terms,
                    caveat.args,
                    execution.callData,
                    msg.sender,
                    delegation.delegator
                )
            );

            if (!success) {
                // Revert with enforcer's error message
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
        }
    }

    /**
     * @notice Execute the delegated action
     * @param execution Execution details
     * @param mode Execution mode
     */
    function _execute(DelegationTypes.Execution memory execution, bytes32 mode) internal {
        DelegationTypes.ExecutionMode execMode = DelegationTypes.decodeExecutionMode(mode);

        if (execMode == DelegationTypes.ExecutionMode.SingleDefault) {
            // Standard execution
            (bool success, bytes memory returnData) = execution.target.call{value: execution.value}(execution.callData);

            if (!success) {
                // Revert with target's error message
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
        } else if (execMode == DelegationTypes.ExecutionMode.TryExecute) {
            // Try execution (don't revert on failure)
            (bool success,) = execution.target.call{value: execution.value}(execution.callData);
            // Intentionally ignore result - TryExecute mode swallows errors
            success; // Suppress unused variable warning
        } else {
            revert("Unsupported execution mode");
        }
    }
}
