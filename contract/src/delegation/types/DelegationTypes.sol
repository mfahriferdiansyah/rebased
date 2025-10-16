// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

// Use MetaMask's official types from Delegation Framework
import { Delegation, Caveat } from "@delegation-framework/utils/Types.sol";

/**
 * @title DelegationTypes
 * @notice Utility library for working with MetaMask DeleGator smart accounts
 * @dev Provides helper functions for DeleGator detection and ownership verification
 *
 * This library uses MetaMask's official Delegation Framework types and does not
 * implement custom delegation logic. All delegation validation and execution
 * is handled by the DelegationManager contract.
 */
library DelegationTypes {
    /**
     * @notice Check if address has contract code deployed
     * @param account Address to check
     * @return hasCode True if address has code (is a contract)
     */
    function isSmartContract(address account) internal view returns (bool hasCode) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @notice Check if address is a MetaMask DeleGator smart account
     * @param account Address to check
     * @return isDeleGatorAccount True if account is a DeleGator
     *
     * @dev Attempts to call owner() function which is present on HybridDeleGator
     *      and other DeleGator implementations. If the call succeeds, it's a DeleGator.
     */
    function isDeleGator(address account) internal view returns (bool isDeleGatorAccount) {
        // Must be a smart contract
        if (!isSmartContract(account)) {
            return false;
        }

        // Try to call owner() function (present on HybridDeleGator)
        // Using low-level call to avoid revert if function doesn't exist
        (bool success, bytes memory data) = account.staticcall(
            abi.encodeWithSignature("owner()")
        );

        // If call succeeded and returned data, it's likely a DeleGator
        // HybridDeleGator.owner() returns address, which is 32 bytes
        return success && data.length == 32;
    }

    /**
     * @notice Get the EOA owner of a DeleGator smart account
     * @param delegator DeleGator smart account address
     * @return owner EOA address that owns and controls the DeleGator
     *
     * @dev HybridDeleGator has an owner() function that returns the EOA owner
     *      Returns address(0) if not a DeleGator or owner() call fails
     */
    function getDeleGatorOwner(address delegator) internal view returns (address owner) {
        // Validate it's a smart contract first
        if (!isSmartContract(delegator)) {
            return address(0);
        }

        // Try to call owner() function
        (bool success, bytes memory data) = delegator.staticcall(
            abi.encodeWithSignature("owner()")
        );

        if (success && data.length == 32) {
            return abi.decode(data, (address));
        }

        return address(0);
    }
}
