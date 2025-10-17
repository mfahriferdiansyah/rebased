// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

// Re-export MetaMask Delegation Framework types and interfaces
import { Delegation, Caveat, ModeCode } from "@delegation-framework/utils/Types.sol";
import { IDelegationManager as IMetaMaskDelegationManager } from "@delegation-framework/interfaces/IDelegationManager.sol";

/**
 * @title IDelegationManager
 * @notice Re-exports MetaMask's IDelegationManager interface
 * @dev Uses official MetaMask Delegation Framework v1.3.0
 *
 * This provides compatibility with our codebase while using MetaMask's battle-tested implementation.
 * Main method: redeemDelegations() - validates and executes delegations with caveat enforcement
 */
interface IDelegationManager is IMetaMaskDelegationManager {
    // Interface inherits all methods from MetaMask's IDelegationManager:
    // - redeemDelegations(bytes[] permissionContexts, ModeCode[] modes, bytes[] executionCallDatas)
    // - enableDelegation(Delegation delegation)
    // - disableDelegation(Delegation delegation)
    // - getDelegationHash(Delegation delegation)
    // - getDomainHash()
    // - pause()
    // - unpause()
    //
    // Events inherited:
    // - RedeemedDelegation
    // - EnabledDelegation
    // - DisabledDelegation
    //
    // Errors inherited:
    // - CannotUseADisabledDelegation
    // - InvalidAuthority
    // - InvalidDelegate
    // - InvalidDelegator
    // - InvalidEOASignature
    // - InvalidERC1271Signature
}
