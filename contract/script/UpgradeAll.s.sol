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
 * @title UpgradeAll
 * @notice Upgrade ALL UUPS contracts at once
 * @dev Upgrades all 5 UUPS proxies with new implementations
 *
 * Usage:
 *   # Monad Testnet
 *   PRIVATE_KEY=0x... CHAIN_NAME=monad \
 *   forge script script/UpgradeAll.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --legacy
 *
 *   # Base Sepolia
 *   PRIVATE_KEY=0x... CHAIN_NAME=base \
 *   forge script script/UpgradeAll.s.sol --rpc-url https://sepolia.base.org --broadcast --legacy
 *
 * Required ENV variables:
 *   - PRIVATE_KEY: Owner private key (must be owner of all proxies)
 *   - CHAIN_NAME: Chain identifier (base/monad)
 *
 * The script will:
 *   1. Read proxy addresses from deployments-{chain}.json
 *   2. Deploy 5 new implementations
 *   3. Upgrade all 5 proxies
 *   4. Verify upgrades succeeded
 *   5. Update JSON with new implementation addresses
 *   6. Print verification commands for all 5 new implementations
 */
contract UpgradeAll is Script {
    struct Implementations {
        address pythOracleImpl;
        address rebalancerConfigImpl;
        address uniswapHelperImpl;
        address strategyRegistryImpl;
        address rebalanceExecutorImpl;
    }

    struct Proxies {
        address pythOracle;
        address rebalancerConfig;
        address uniswapHelper;
        address strategyRegistry;
        address rebalanceExecutor;
    }

    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(ownerPrivateKey);
        string memory chainName = vm.envString("CHAIN_NAME");

        console.log("\n=== REBASED UPGRADE ALL CONTRACTS ===");
        console.log("Chain ID:", vm.toString(block.chainid));
        console.log("Chain Name:", chainName);
        console.log("Owner:", owner);

        // Read deployment JSON
        string memory deploymentFile = string.concat("deployments-", chainName, ".json");
        string memory json = vm.readFile(deploymentFile);
        console.log("Reading from:", deploymentFile);

        // Extract proxy addresses
        string memory prefix = string.concat(".", chainName, ".");
        Proxies memory proxies;
        proxies.pythOracle = vm.parseJsonAddress(json, string.concat(prefix, "pythOracle"));
        proxies.rebalancerConfig = vm.parseJsonAddress(json, string.concat(prefix, "rebalancerConfig"));
        proxies.uniswapHelper = vm.parseJsonAddress(json, string.concat(prefix, "uniswapHelper"));
        proxies.strategyRegistry = vm.parseJsonAddress(json, string.concat(prefix, "strategyRegistry"));
        proxies.rebalanceExecutor = vm.parseJsonAddress(json, string.concat(prefix, "rebalanceExecutor"));

        console.log("\n=== PROXY ADDRESSES ===");
        console.log("PythOracle Proxy:", proxies.pythOracle);
        console.log("RebalancerConfig Proxy:", proxies.rebalancerConfig);
        console.log("UniswapHelper Proxy:", proxies.uniswapHelper);
        console.log("StrategyRegistry Proxy:", proxies.strategyRegistry);
        console.log("RebalanceExecutor Proxy:", proxies.rebalanceExecutor);

        vm.startBroadcast(ownerPrivateKey);

        // Deploy all new implementations
        console.log("\n=== DEPLOYING NEW IMPLEMENTATIONS ===");
        Implementations memory newImpls;

        PythOracle pythOracleImpl = new PythOracle();
        newImpls.pythOracleImpl = address(pythOracleImpl);
        console.log("1. PythOracle Implementation:", newImpls.pythOracleImpl);

        RebalancerConfig rebalancerConfigImpl = new RebalancerConfig();
        newImpls.rebalancerConfigImpl = address(rebalancerConfigImpl);
        console.log("2. RebalancerConfig Implementation:", newImpls.rebalancerConfigImpl);

        UniswapHelper uniswapHelperImpl = new UniswapHelper();
        newImpls.uniswapHelperImpl = address(uniswapHelperImpl);
        console.log("3. UniswapHelper Implementation:", newImpls.uniswapHelperImpl);

        StrategyRegistry strategyRegistryImpl = new StrategyRegistry();
        newImpls.strategyRegistryImpl = address(strategyRegistryImpl);
        console.log("4. StrategyRegistry Implementation:", newImpls.strategyRegistryImpl);

        RebalanceExecutor rebalanceExecutorImpl = new RebalanceExecutor();
        newImpls.rebalanceExecutorImpl = address(rebalanceExecutorImpl);
        console.log("5. RebalanceExecutor Implementation:", newImpls.rebalanceExecutorImpl);

        // Upgrade all proxies
        console.log("\n=== UPGRADING ALL PROXIES ===");

        PythOracle(proxies.pythOracle).upgradeToAndCall(newImpls.pythOracleImpl, "");
        console.log("1. PythOracle upgraded");

        RebalancerConfig(proxies.rebalancerConfig).upgradeToAndCall(newImpls.rebalancerConfigImpl, "");
        console.log("2. RebalancerConfig upgraded");

        UniswapHelper(proxies.uniswapHelper).upgradeToAndCall(newImpls.uniswapHelperImpl, "");
        console.log("3. UniswapHelper upgraded");

        StrategyRegistry(proxies.strategyRegistry).upgradeToAndCall(newImpls.strategyRegistryImpl, "");
        console.log("4. StrategyRegistry upgraded");

        RebalanceExecutor(payable(proxies.rebalanceExecutor)).upgradeToAndCall(newImpls.rebalanceExecutorImpl, "");
        console.log("5. RebalanceExecutor upgraded");

        vm.stopBroadcast();

        // Verify all upgrades
        console.log("\n=== VERIFYING UPGRADES ===");
        require(_getImplementation(proxies.pythOracle) == newImpls.pythOracleImpl, "PythOracle upgrade failed");
        console.log("1. PythOracle verified");

        require(_getImplementation(proxies.rebalancerConfig) == newImpls.rebalancerConfigImpl, "RebalancerConfig upgrade failed");
        console.log("2. RebalancerConfig verified");

        require(_getImplementation(proxies.uniswapHelper) == newImpls.uniswapHelperImpl, "UniswapHelper upgrade failed");
        console.log("3. UniswapHelper verified");

        require(_getImplementation(proxies.strategyRegistry) == newImpls.strategyRegistryImpl, "StrategyRegistry upgrade failed");
        console.log("4. StrategyRegistry verified");

        require(_getImplementation(proxies.rebalanceExecutor) == newImpls.rebalanceExecutorImpl, "RebalanceExecutor upgrade failed");
        console.log("5. RebalanceExecutor verified");

        // Update deployment JSON
        console.log("\n=== UPDATING DEPLOYMENT JSON ===");
        _updateDeploymentJSON(chainName, newImpls);
        console.log("Updated:", deploymentFile);

        // Print verification commands
        console.log("\n=== CONTRACT VERIFICATION COMMANDS ===");
        console.log("Copy and run these commands to verify the new implementations:\n");

        if (block.chainid == 84532) {
            // Base Sepolia - Blockscout
            _printBaseVerificationCommands(newImpls);
        } else if (block.chainid == 10143) {
            // Monad Testnet - Sourcify
            _printMonadVerificationCommands(newImpls);
        }

        console.log("\n=== UPGRADE ALL COMPLETE ===");
        console.log("All 5 contracts upgraded successfully");
        console.log("Remember to verify all new implementations on the block explorer!");
    }

    function _getImplementation(address proxy) internal view returns (address) {
        bytes32 implementationSlot = ERC1967Utils.IMPLEMENTATION_SLOT;
        address implementation = address(uint160(uint256(vm.load(proxy, implementationSlot))));
        return implementation;
    }

    function _updateDeploymentJSON(string memory chainName, Implementations memory newImpls) internal {
        // Read existing JSON
        string memory deploymentFile = string.concat("deployments-", chainName, ".json");
        string memory json = vm.readFile(deploymentFile);

        // Parse existing values
        string memory prefix = string.concat(".", chainName, ".");

        // Create updated JSON manually (without custom caveat enforcers - using MetaMask's built-in ones)
        string memory updatedJson = string.concat(
            "{\n  \"", chainName, "\": {\n",
            "    \"pythOracle\": \"", vm.toString(vm.parseJsonAddress(json, string.concat(prefix, "pythOracle"))), "\",\n",
            "    \"pythOracleImpl\": \"", vm.toString(newImpls.pythOracleImpl), "\",\n",
            "    \"rebalancerConfig\": \"", vm.toString(vm.parseJsonAddress(json, string.concat(prefix, "rebalancerConfig"))), "\",\n",
            "    \"rebalancerConfigImpl\": \"", vm.toString(newImpls.rebalancerConfigImpl), "\",\n",
            "    \"uniswapHelper\": \"", vm.toString(vm.parseJsonAddress(json, string.concat(prefix, "uniswapHelper"))), "\",\n",
            "    \"uniswapHelperImpl\": \"", vm.toString(newImpls.uniswapHelperImpl), "\",\n",
            "    \"delegationManager\": \"", vm.toString(vm.parseJsonAddress(json, string.concat(prefix, "delegationManager"))), "\",\n",
            "    \"strategyRegistry\": \"", vm.toString(vm.parseJsonAddress(json, string.concat(prefix, "strategyRegistry"))), "\",\n",
            "    \"strategyRegistryImpl\": \"", vm.toString(newImpls.strategyRegistryImpl), "\",\n",
            "    \"rebalanceExecutor\": \"", vm.toString(vm.parseJsonAddress(json, string.concat(prefix, "rebalanceExecutor"))), "\",\n",
            "    \"rebalanceExecutorImpl\": \"", vm.toString(newImpls.rebalanceExecutorImpl), "\"\n",
            "  }\n}"
        );

        // Write updated JSON
        vm.writeFile(deploymentFile, updatedJson);
    }

    function _printBaseVerificationCommands(Implementations memory impls) internal view {
        string memory prefix = "forge verify-contract --rpc-url https://sepolia.base.org --verifier blockscout --verifier-url 'https://base-sepolia.blockscout.com/api/'";

        console.log("# Base Sepolia Verification (Blockscout - FREE)\n");
        console.log(string.concat(prefix, " ", vm.toString(impls.pythOracleImpl), " src/PythOracle.sol:PythOracle"));
        console.log(string.concat(prefix, " ", vm.toString(impls.rebalancerConfigImpl), " src/RebalancerConfig.sol:RebalancerConfig"));
        console.log(string.concat(prefix, " ", vm.toString(impls.uniswapHelperImpl), " src/UniswapHelper.sol:UniswapHelper"));
        console.log(string.concat(prefix, " ", vm.toString(impls.strategyRegistryImpl), " src/StrategyRegistry.sol:StrategyRegistry"));
        console.log(string.concat(prefix, " ", vm.toString(impls.rebalanceExecutorImpl), " src/RebalanceExecutor.sol:RebalanceExecutor"));
    }

    function _printMonadVerificationCommands(Implementations memory impls) internal view {
        string memory prefix = "forge verify-contract --rpc-url https://testnet-rpc.monad.xyz --verifier sourcify --verifier-url 'https://sourcify-api-monad.blockvision.org'";

        console.log("# Monad Testnet Verification (Sourcify - FREE)\n");
        console.log(string.concat(prefix, " ", vm.toString(impls.pythOracleImpl), " src/PythOracle.sol:PythOracle"));
        console.log(string.concat(prefix, " ", vm.toString(impls.rebalancerConfigImpl), " src/RebalancerConfig.sol:RebalancerConfig"));
        console.log(string.concat(prefix, " ", vm.toString(impls.uniswapHelperImpl), " src/UniswapHelper.sol:UniswapHelper"));
        console.log(string.concat(prefix, " ", vm.toString(impls.strategyRegistryImpl), " src/StrategyRegistry.sol:StrategyRegistry"));
        console.log(string.concat(prefix, " ", vm.toString(impls.rebalanceExecutorImpl), " src/RebalanceExecutor.sol:RebalanceExecutor"));
    }
}
