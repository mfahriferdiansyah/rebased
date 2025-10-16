// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";

/**
 * @title VerifyContracts
 * @notice Verify all deployed contracts on block explorers
 * @dev Reads deployment JSON and verifies implementations + DelegationManager
 *
 * Usage:
 *   # Base Sepolia
 *   forge script script/VerifyContracts.s.sol --rpc-url base_sepolia --broadcast
 *
 *   # Monad Testnet
 *   forge script script/VerifyContracts.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast
 */
contract VerifyContracts is Script {
    function run() external view {
        uint256 chainId = block.chainid;
        string memory chainName;

        // Determine chain and verification method
        if (chainId == 84532) {
            chainName = "base";
            console.log("\n=== VERIFYING CONTRACTS ON BASE SEPOLIA ===");
            console.log("Explorer: https://sepolia.basescan.org");
        } else if (chainId == 10143) {
            chainName = "monad";
            console.log("\n=== VERIFYING CONTRACTS ON MONAD TESTNET ===");
            console.log("Explorer: https://testnet.monadexplorer.com");
        } else {
            revert(string.concat("Unsupported chain ID: ", vm.toString(chainId)));
        }

        // Read deployment JSON
        string memory deploymentFile = string.concat("deployments-", chainName, ".json");
        string memory json = vm.readFile(deploymentFile);
        console.log("Reading from:", deploymentFile);

        // Extract addresses from JSON
        string memory prefix = string.concat(".", chainName, ".");

        // UUPS Proxy Implementations (must be verified)
        address pythOracleImpl = vm.parseJsonAddress(json, string.concat(prefix, "pythOracleImpl"));
        address rebalancerConfigImpl = vm.parseJsonAddress(json, string.concat(prefix, "rebalancerConfigImpl"));
        address uniswapHelperImpl = vm.parseJsonAddress(json, string.concat(prefix, "uniswapHelperImpl"));
        address strategyRegistryImpl = vm.parseJsonAddress(json, string.concat(prefix, "strategyRegistryImpl"));
        address rebalanceExecutorImpl = vm.parseJsonAddress(json, string.concat(prefix, "rebalanceExecutorImpl"));

        // Regular contracts (non-upgradeable)
        address delegationManager = vm.parseJsonAddress(json, string.concat(prefix, "delegationManager"));

        console.log("\n=== IMPLEMENTATION CONTRACTS (UUPS) ===");
        console.log("PythOracle Implementation:", pythOracleImpl);
        console.log("RebalancerConfig Implementation:", rebalancerConfigImpl);
        console.log("UniswapHelper Implementation:", uniswapHelperImpl);
        console.log("StrategyRegistry Implementation:", strategyRegistryImpl);
        console.log("RebalanceExecutor Implementation:", rebalanceExecutorImpl);

        console.log("\n=== REGULAR CONTRACTS ===");
        console.log("DelegationManager:", delegationManager);
        console.log("Note: Using MetaMask's built-in caveat enforcers (no custom enforcers)");

        // Generate verification commands
        console.log("\n=== VERIFICATION COMMANDS ===");
        console.log("Copy and run these commands to verify contracts:\n");

        if (chainId == 84532) {
            _printBaseVerificationCommands(
                pythOracleImpl,
                rebalancerConfigImpl,
                uniswapHelperImpl,
                strategyRegistryImpl,
                rebalanceExecutorImpl,
                delegationManager
            );
        } else if (chainId == 10143) {
            _printMonadVerificationCommands(
                pythOracleImpl,
                rebalancerConfigImpl,
                uniswapHelperImpl,
                strategyRegistryImpl,
                rebalanceExecutorImpl,
                delegationManager
            );
        }

        console.log("\n=== VERIFICATION COMPLETE ===");
        console.log("NOTE: Run the commands above to verify contracts on the block explorer");
    }

    function _printBaseVerificationCommands(
        address pythOracleImpl,
        address rebalancerConfigImpl,
        address uniswapHelperImpl,
        address strategyRegistryImpl,
        address rebalanceExecutorImpl,
        address delegationManager
    ) internal pure {
        string memory prefix =
            "forge verify-contract --rpc-url https://sepolia-preconf.base.org --verifier blockscout --verifier-url 'https://base-sepolia.blockscout.com/api/'";

        console.log("# Base Sepolia Verification Commands (Blockscout - Free)");
        console.log("");
        console.log("# UUPS Implementations");
        console.log(string.concat(prefix, " ", vm.toString(pythOracleImpl), " src/PythOracle.sol:PythOracle"));
        console.log(
            string.concat(prefix, " ", vm.toString(rebalancerConfigImpl), " src/RebalancerConfig.sol:RebalancerConfig")
        );
        console.log(string.concat(prefix, " ", vm.toString(uniswapHelperImpl), " src/UniswapHelper.sol:UniswapHelper"));
        console.log(
            string.concat(prefix, " ", vm.toString(strategyRegistryImpl), " src/StrategyRegistry.sol:StrategyRegistry")
        );
        console.log(
            string.concat(
                prefix, " ", vm.toString(rebalanceExecutorImpl), " src/RebalanceExecutor.sol:RebalanceExecutor"
            )
        );
        console.log("");
        console.log("# Regular Contracts");
        console.log(
            string.concat(
                prefix, " ", vm.toString(delegationManager), " @delegation-framework/DelegationManager.sol:DelegationManager"
            )
        );
    }

    function _printMonadVerificationCommands(
        address pythOracleImpl,
        address rebalancerConfigImpl,
        address uniswapHelperImpl,
        address strategyRegistryImpl,
        address rebalanceExecutorImpl,
        address delegationManager
    ) internal pure {
        string memory prefix =
            "forge verify-contract --rpc-url https://testnet-rpc.monad.xyz --verifier sourcify --verifier-url 'https://sourcify-api-monad.blockvision.org'";

        console.log("# Monad Testnet Verification Commands (Sourcify - Free)");
        console.log("");
        console.log("# UUPS Implementations");
        console.log(string.concat(prefix, " ", vm.toString(pythOracleImpl), " src/PythOracle.sol:PythOracle"));
        console.log(
            string.concat(prefix, " ", vm.toString(rebalancerConfigImpl), " src/RebalancerConfig.sol:RebalancerConfig")
        );
        console.log(string.concat(prefix, " ", vm.toString(uniswapHelperImpl), " src/UniswapHelper.sol:UniswapHelper"));
        console.log(
            string.concat(prefix, " ", vm.toString(strategyRegistryImpl), " src/StrategyRegistry.sol:StrategyRegistry")
        );
        console.log(
            string.concat(
                prefix, " ", vm.toString(rebalanceExecutorImpl), " src/RebalanceExecutor.sol:RebalanceExecutor"
            )
        );
        console.log("");
        console.log("# Regular Contracts");
        console.log(
            string.concat(
                prefix, " ", vm.toString(delegationManager), " @delegation-framework/DelegationManager.sol:DelegationManager"
            )
        );
    }
}
