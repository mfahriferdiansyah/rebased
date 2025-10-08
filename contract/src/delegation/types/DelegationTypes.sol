// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DelegationTypes
 * @notice Core data structures and type definitions for ERC-7710 delegation framework
 * @dev Implements MetaMask-compatible delegation types with EIP-712 signing support
 */
library DelegationTypes {
    /// @notice Contract version for EIP-712 domain
    string public constant VERSION = "1.0.0";

    /**
     * @notice Delegation struct - core delegation data structure
     * @dev Compatible with MetaMask Delegation Framework and ERC-7710
     * @param delegate Address that can execute actions (redeemer)
     * @param delegator Address granting permission (authority holder)
     * @param authority Parent delegation hash (0x0 for root delegations)
     * @param caveats Array of restrictions enforced during execution
     * @param salt Unique value to prevent delegation collision
     * @param signature EIP-712 signature from delegator
     */
    struct Delegation {
        address delegate;
        address delegator;
        bytes32 authority;
        Caveat[] caveats;
        uint256 salt;
        bytes signature;
    }

    /**
     * @notice Caveat struct - restriction enforced on delegations
     * @dev Each caveat is enforced by a CaveatEnforcer contract
     * @param enforcer Address of CaveatEnforcer contract
     * @param terms Encoded restriction parameters (e.g., allowed methods, time limits)
     * @param args Runtime arguments passed during redemption
     */
    struct Caveat {
        address enforcer;
        bytes terms;
        bytes args;
    }

    /**
     * @notice PackedUserOperation - ERC-4337 user operation data
     * @dev Packed format for gas efficiency, compatible with EntryPoint v0.7
     * @param sender Smart account address executing the operation
     * @param nonce Anti-replay parameter from EntryPoint
     * @param initCode Contract creation code (empty if account exists)
     * @param callData Execution data to call on sender
     * @param accountGasLimits Packed: verificationGasLimit (16 bytes) + callGasLimit (16 bytes)
     * @param preVerificationGas Gas overhead not measured by EVM
     * @param gasFees Packed: maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
     * @param paymasterAndData Paymaster address and data (empty if user pays)
     * @param signature Signature over userOp hash for validation
     */
    struct PackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    /**
     * @notice Execution mode for delegation redemption
     * @dev Determines how the execution calldata is interpreted
     * @param SingleDefault Standard execution mode (call to target contract)
     * @param SingleBatch Batch multiple calls in single execution
     * @param TryExecute Try execution, don't revert on failure
     */
    enum ExecutionMode {
        SingleDefault,
        SingleBatch,
        TryExecute
    }

    /**
     * @notice Execution struct - describes action to execute with delegation
     * @param target Contract address to call
     * @param value Native token amount to send
     * @param callData Encoded function call
     */
    struct Execution {
        address target;
        uint256 value;
        bytes callData;
    }

    // EIP-712 Domain Typehash
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    // Delegation Typehash (includes nested Caveat type)
    bytes32 public constant DELEGATION_TYPEHASH = keccak256(
        "Delegation(address delegate,address delegator,bytes32 authority,Caveat[] caveats,uint256 salt)Caveat(address enforcer,bytes terms,bytes args)"
    );

    // Caveat Typehash
    bytes32 public constant CAVEAT_TYPEHASH = keccak256("Caveat(address enforcer,bytes terms,bytes args)");

    /**
     * @notice Compute EIP-712 domain separator
     * @param name Contract name for domain
     * @param contractAddress Contract address for domain
     * @return Domain separator hash
     */
    function getDomainSeparator(string memory name, address contractAddress) internal view returns (bytes32) {
        return keccak256(
            abi.encode(EIP712_DOMAIN_TYPEHASH, keccak256(bytes(name)), keccak256(bytes(VERSION)), block.chainid, contractAddress)
        );
    }

    /**
     * @notice Hash a single caveat for EIP-712 signing
     * @param caveat Caveat to hash
     * @return Caveat struct hash
     */
    function hashCaveat(Caveat memory caveat) internal pure returns (bytes32) {
        return keccak256(abi.encode(CAVEAT_TYPEHASH, caveat.enforcer, keccak256(caveat.terms), keccak256(caveat.args)));
    }

    /**
     * @notice Hash an array of caveats
     * @param caveats Array of caveats to hash
     * @return Hash of all caveats
     */
    function hashCaveats(Caveat[] memory caveats) internal pure returns (bytes32) {
        bytes32[] memory caveatHashes = new bytes32[](caveats.length);
        for (uint256 i = 0; i < caveats.length; i++) {
            caveatHashes[i] = hashCaveat(caveats[i]);
        }
        return keccak256(abi.encodePacked(caveatHashes));
    }

    /**
     * @notice Compute delegation hash for EIP-712 signing
     * @param delegation Delegation to hash (without signature)
     * @return Delegation struct hash
     */
    function hashDelegation(Delegation memory delegation) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                DELEGATION_TYPEHASH,
                delegation.delegate,
                delegation.delegator,
                delegation.authority,
                hashCaveats(delegation.caveats),
                delegation.salt
            )
        );
    }

    /**
     * @notice Compute full EIP-712 message hash for signing
     * @param delegation Delegation to sign
     * @param domainSeparator EIP-712 domain separator
     * @return Message hash ready for ECDSA signing
     */
    function getMessageHash(Delegation memory delegation, bytes32 domainSeparator) internal pure returns (bytes32) {
        bytes32 structHash = hashDelegation(delegation);
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    /**
     * @notice Extract execution mode from bytes32
     * @param mode Packed mode bytes
     * @return ExecutionMode enum
     */
    function decodeExecutionMode(bytes32 mode) internal pure returns (ExecutionMode) {
        return ExecutionMode(uint256(mode) & 0xFF);
    }

    /**
     * @notice Encode execution mode to bytes32
     * @param mode ExecutionMode enum
     * @return Packed mode bytes
     */
    function encodeExecutionMode(ExecutionMode mode) internal pure returns (bytes32) {
        return bytes32(uint256(mode));
    }
}
