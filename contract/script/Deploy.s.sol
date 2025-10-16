// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/StrategyRegistry.sol";
import "../src/RebalanceExecutor.sol";
import "../src/PythOracle.sol";
import "../src/UniswapHelper.sol";
import "../src/RebalancerConfig.sol";
import { DelegationManager } from "@delegation-framework/DelegationManager.sol";

/**
 * @title Deploy
 * @notice Deploy all contracts for Rebased non-custodial system with UUPS proxies
 * @dev Chain-flexible deployment script using environment variables
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url <chain> --broadcast --verify
 *
 * Required ENV variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - PYTH_CONTRACT: Pyth oracle contract address (chain-specific)
 *   - UNISWAP_V2_ROUTER: Uniswap V2 Router address (chain-specific)
 *   - UNISWAP_V2_FACTORY: Uniswap V2 Factory address (chain-specific)
 *   - CHAIN_NAME: Chain identifier (monad/base) for deployments.json
 *
 * Optional ENV variables:
 *   - ETHERSCAN_API_KEY: For contract verification (chain-specific)
 */
contract Deploy is Script {
    struct Deployment {
        address pythOracle;
        address pythOracleImpl;
        address rebalancerConfig;
        address rebalancerConfigImpl;
        address uniswapHelper;
        address uniswapHelperImpl;
        address delegationManager;
        address strategyRegistry;
        address strategyRegistryImpl;
        address rebalanceExecutor;
        address rebalanceExecutorImpl;
    }

    function run() external returns (Deployment memory) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n=== REBASED DEPLOYMENT ===");
        console.log("Chain:", vm.toString(block.chainid));
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        // Load chain-specific config
        address pythContract = vm.envAddress("PYTH_CONTRACT");
        address uniswapRouter = vm.envAddress("UNISWAP_V2_ROUTER");
        address uniswapFactory = vm.envAddress("UNISWAP_V2_FACTORY");
        string memory chainName = vm.envString("CHAIN_NAME");

        console.log("\nChain Config:");
        console.log("  Pyth:", pythContract);
        console.log("  Uniswap Router:", uniswapRouter);
        console.log("  Uniswap Factory:", uniswapFactory);

        vm.startBroadcast(deployerPrivateKey);

        Deployment memory deployment;

        // ============================================
        // 1. Deploy PythOracle (UUPS Proxy)
        // ============================================
        console.log("\n1. Deploying PythOracle...");
        PythOracle oracleImpl = new PythOracle();
        deployment.pythOracleImpl = address(oracleImpl);
        console.log("  Implementation:", deployment.pythOracleImpl);

        bytes memory oracleInitData = abi.encodeWithSelector(
            PythOracle.initialize.selector,
            deployer,
            pythContract
        );
        ERC1967Proxy oracleProxy = new ERC1967Proxy(address(oracleImpl), oracleInitData);
        deployment.pythOracle = address(oracleProxy);
        console.log("  Proxy:", deployment.pythOracle);

        // ============================================
        // 2. Deploy RebalancerConfig (UUPS Proxy)
        // ============================================
        console.log("\n2. Deploying RebalancerConfig...");
        RebalancerConfig configImpl = new RebalancerConfig();
        deployment.rebalancerConfigImpl = address(configImpl);
        console.log("  Implementation:", deployment.rebalancerConfigImpl);

        bytes memory configInitData = abi.encodeWithSelector(
            RebalancerConfig.initialize.selector,
            deployer
        );
        ERC1967Proxy configProxy = new ERC1967Proxy(address(configImpl), configInitData);
        deployment.rebalancerConfig = address(configProxy);
        console.log("  Proxy:", deployment.rebalancerConfig);

        // ============================================
        // 3. Deploy UniswapHelper (UUPS Proxy)
        // ============================================
        console.log("\n3. Deploying UniswapHelper...");
        UniswapHelper uniswapHelperImpl = new UniswapHelper();
        deployment.uniswapHelperImpl = address(uniswapHelperImpl);
        console.log("  Implementation:", deployment.uniswapHelperImpl);

        bytes memory uniswapInitData = abi.encodeWithSelector(
            UniswapHelper.initialize.selector,
            uniswapRouter,
            uniswapFactory
        );
        ERC1967Proxy uniswapProxy = new ERC1967Proxy(address(uniswapHelperImpl), uniswapInitData);
        deployment.uniswapHelper = address(uniswapProxy);
        console.log("  Proxy:", deployment.uniswapHelper);

        // ============================================
        // 4. Deploy MetaMask DelegationManager (Non-upgradeable)
        // ============================================
        console.log("\n4. Deploying MetaMask DelegationManager...");
        console.log("  Using official MetaMask Delegation Framework v1.3.0");
        DelegationManager delegationManager = new DelegationManager(deployer);
        deployment.delegationManager = address(delegationManager);
        console.log("  Address:", deployment.delegationManager);
        console.log("  Owner:", deployer);
        console.log("  DeleGator-compatible: YES");
        console.log("  ERC-7710 compliant: YES");
        console.log("  Note: Using MetaMask's built-in caveat enforcers");

        // ============================================
        // 5. Deploy StrategyRegistry (UUPS Proxy)
        // ============================================
        console.log("\n5. Deploying StrategyRegistry...");
        StrategyRegistry registryImpl = new StrategyRegistry();
        deployment.strategyRegistryImpl = address(registryImpl);
        console.log("  Implementation:", deployment.strategyRegistryImpl);

        bytes memory registryInitData = abi.encodeWithSelector(
            StrategyRegistry.initialize.selector,
            deployer
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInitData);
        deployment.strategyRegistry = address(registryProxy);
        console.log("  Proxy:", deployment.strategyRegistry);

        // ============================================
        // 6. Deploy RebalanceExecutor (UUPS Proxy)
        // ============================================
        console.log("\n6. Deploying RebalanceExecutor...");
        RebalanceExecutor executorImpl = new RebalanceExecutor();
        deployment.rebalanceExecutorImpl = address(executorImpl);
        console.log("  Implementation:", deployment.rebalanceExecutorImpl);

        bytes memory executorInitData = abi.encodeWithSelector(
            RebalanceExecutor.initialize.selector,
            deployer,
            deployment.delegationManager,
            deployment.strategyRegistry,
            deployment.pythOracle,
            deployment.uniswapHelper,
            deployment.rebalancerConfig
        );
        ERC1967Proxy executorProxy = new ERC1967Proxy(address(executorImpl), executorInitData);
        deployment.rebalanceExecutor = address(executorProxy);
        console.log("  Proxy:", deployment.rebalanceExecutor);

        // ============================================
        // 7. Link Registry to Executor
        // ============================================
        console.log("\n7. Linking Registry to Executor...");
        StrategyRegistry(deployment.strategyRegistry).setRebalanceExecutor(deployment.rebalanceExecutor);
        console.log("  Registry linked to Executor");

        vm.stopBroadcast();

        // ============================================
        // 8. Output Deployment Summary
        // ============================================
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("PythOracle:", deployment.pythOracle);
        console.log("RebalancerConfig:", deployment.rebalancerConfig);
        console.log("UniswapHelper:", deployment.uniswapHelper);
        console.log("DelegationManager:", deployment.delegationManager);
        console.log("StrategyRegistry:", deployment.strategyRegistry);
        console.log("RebalanceExecutor:", deployment.rebalanceExecutor);

        // ============================================
        // 9. Save Deployment to JSON
        // ============================================
        _saveDeployment(chainName, deployment);

        return deployment;
    }

    function _saveDeployment(string memory chainName, Deployment memory deployment) internal {
        string memory json = string.concat(
            '{\n',
            '  "', chainName, '": {\n',
            '    "pythOracle": "', vm.toString(deployment.pythOracle), '",\n',
            '    "pythOracleImpl": "', vm.toString(deployment.pythOracleImpl), '",\n',
            '    "rebalancerConfig": "', vm.toString(deployment.rebalancerConfig), '",\n',
            '    "rebalancerConfigImpl": "', vm.toString(deployment.rebalancerConfigImpl), '",\n',
            '    "uniswapHelper": "', vm.toString(deployment.uniswapHelper), '",\n',
            '    "uniswapHelperImpl": "', vm.toString(deployment.uniswapHelperImpl), '",\n',
            '    "delegationManager": "', vm.toString(deployment.delegationManager), '",\n',
            '    "strategyRegistry": "', vm.toString(deployment.strategyRegistry), '",\n',
            '    "strategyRegistryImpl": "', vm.toString(deployment.strategyRegistryImpl), '",\n',
            '    "rebalanceExecutor": "', vm.toString(deployment.rebalanceExecutor), '",\n',
            '    "rebalanceExecutorImpl": "', vm.toString(deployment.rebalanceExecutorImpl), '"\n',
            '  }\n',
            '}'
        );

        string memory filename = string.concat("deployments-", chainName, ".json");
        vm.writeFile(filename, json);
        console.log(string.concat("\nDeployment saved to ", filename));
    }
}
