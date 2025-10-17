// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "../src/StrategyRegistry.sol";
import "../src/RebalanceExecutor.sol";
import "../src/PythOracle.sol";
import "../src/UniswapHelper.sol";
import "../src/RebalancerConfig.sol";

/**
 * @title Upgrade
 * @notice UUPS upgrade script for Rebased contracts
 * @dev Chain-flexible upgrade script using environment variables
 *
 * Usage:
 *   forge script script/Upgrade.s.sol --rpc-url <chain> --broadcast
 *
 * Required ENV variables:
 *   - PRIVATE_KEY: Owner private key (must be owner of proxy)
 *   - PROXY_ADDRESS: Address of proxy to upgrade
 *   - CONTRACT_TYPE: Type of contract (PythOracle/RebalancerConfig/UniswapHelper/StrategyRegistry/RebalanceExecutor)
 *
 * Example:
 *   PRIVATE_KEY=0x... \
 *   PROXY_ADDRESS=0x123... \
 *   CONTRACT_TYPE=RebalanceExecutor \
 *   forge script script/Upgrade.s.sol --rpc-url base_sepolia --broadcast
 */
contract Upgrade is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(ownerPrivateKey);
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        string memory contractType = vm.envString("CONTRACT_TYPE");

        console.log("\n=== REBASED UPGRADE ===");
        console.log("Chain:", vm.toString(block.chainid));
        console.log("Owner:", owner);
        console.log("Proxy:", proxyAddress);
        console.log("Contract Type:", contractType);

        vm.startBroadcast(ownerPrivateKey);

        address newImplementation;

        // Deploy new implementation based on contract type
        if (keccak256(bytes(contractType)) == keccak256("PythOracle")) {
            PythOracle newImpl = new PythOracle();
            newImplementation = address(newImpl);
            console.log("\nNew PythOracle implementation:", newImplementation);

            // Upgrade via UUPS
            PythOracle(proxyAddress).upgradeToAndCall(newImplementation, "");

        } else if (keccak256(bytes(contractType)) == keccak256("RebalancerConfig")) {
            RebalancerConfig newImpl = new RebalancerConfig();
            newImplementation = address(newImpl);
            console.log("\nNew RebalancerConfig implementation:", newImplementation);

            // Upgrade via UUPS
            RebalancerConfig(proxyAddress).upgradeToAndCall(newImplementation, "");

        } else if (keccak256(bytes(contractType)) == keccak256("UniswapHelper")) {
            UniswapHelper newImpl = new UniswapHelper();
            newImplementation = address(newImpl);
            console.log("\nNew UniswapHelper implementation:", newImplementation);

            // Upgrade via UUPS
            UniswapHelper(proxyAddress).upgradeToAndCall(newImplementation, "");

        } else if (keccak256(bytes(contractType)) == keccak256("StrategyRegistry")) {
            StrategyRegistry newImpl = new StrategyRegistry();
            newImplementation = address(newImpl);
            console.log("\nNew StrategyRegistry implementation:", newImplementation);

            // Upgrade via UUPS
            StrategyRegistry(proxyAddress).upgradeToAndCall(newImplementation, "");

        } else if (keccak256(bytes(contractType)) == keccak256("RebalanceExecutor")) {
            RebalanceExecutor newImpl = new RebalanceExecutor();
            newImplementation = address(newImpl);
            console.log("\nNew RebalanceExecutor implementation:", newImplementation);

            // Upgrade via UUPS
            RebalanceExecutor(payable(proxyAddress)).upgradeToAndCall(newImplementation, "");

        } else {
            revert("Invalid CONTRACT_TYPE. Must be: PythOracle, RebalancerConfig, UniswapHelper, StrategyRegistry, or RebalanceExecutor");
        }

        vm.stopBroadcast();

        // Verify upgrade
        address currentImplementation = _getImplementation(proxyAddress);
        console.log("\n=== UPGRADE COMPLETE ===");
        console.log("Current Implementation:", currentImplementation);
        require(currentImplementation == newImplementation, "Upgrade failed - implementation mismatch");
        console.log("Upgrade verified successfully");

        // Get and log version
        _logVersion(contractType, proxyAddress);

        // Verification reminder
        console.log("\n=== CONTRACT VERIFICATION ===");
        console.log("IMPORTANT: Verify the new implementation on the block explorer");
        console.log("New Implementation Address:", newImplementation);
        console.log("\nVerification command:");

        if (block.chainid == 84532) {
            // Base Sepolia - Blockscout (FREE)
            console.log(string.concat(
                "forge verify-contract --rpc-url https://sepolia.base.org --verifier blockscout --verifier-url 'https://base-sepolia.blockscout.com/api/' ",
                vm.toString(newImplementation),
                " src/", contractType, ".sol:", contractType
            ));
        } else if (block.chainid == 10143) {
            // Monad Testnet - Sourcify (FREE)
            console.log(string.concat(
                "forge verify-contract --rpc-url https://testnet-rpc.monad.xyz --verifier sourcify --verifier-url 'https://sourcify-api-monad.blockvision.org' ",
                vm.toString(newImplementation),
                " src/", contractType, ".sol:", contractType
            ));
        }
    }

    /**
     * @notice Get implementation address from proxy
     * @dev Reads ERC1967 implementation slot
     */
    function _getImplementation(address proxy) internal view returns (address) {
        bytes32 implementationSlot = ERC1967Utils.IMPLEMENTATION_SLOT;
        address implementation = address(uint160(uint256(vm.load(proxy, implementationSlot))));
        return implementation;
    }

    /**
     * @notice Log contract version after upgrade
     */
    function _logVersion(string memory contractType, address proxyAddress) internal view {
        if (keccak256(bytes(contractType)) == keccak256("PythOracle")) {
            string memory version = PythOracle(proxyAddress).getVersion();
            console.log("Contract Version:", version);
        } else if (keccak256(bytes(contractType)) == keccak256("RebalancerConfig")) {
            string memory version = RebalancerConfig(proxyAddress).getVersion();
            console.log("Contract Version:", version);
        } else if (keccak256(bytes(contractType)) == keccak256("UniswapHelper")) {
            string memory version = UniswapHelper(proxyAddress).getVersion();
            console.log("Contract Version:", version);
        } else if (keccak256(bytes(contractType)) == keccak256("StrategyRegistry")) {
            string memory version = StrategyRegistry(proxyAddress).getVersion();
            console.log("Contract Version:", version);
        } else if (keccak256(bytes(contractType)) == keccak256("RebalanceExecutor")) {
            string memory version = RebalanceExecutor(payable(proxyAddress)).getVersion();
            console.log("Contract Version:", version);
        }
    }
}
