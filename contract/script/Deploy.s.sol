// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/StrategyRegistry.sol";
import "../src/RebalanceExecutor.sol";
import "../src/PythOracle.sol";
import "../src/UniswapHelper.sol";
import "../src/RebalancerConfig.sol";
import "../src/delegation/DelegationManager.sol";
import "../src/delegation/enforcers/AllowedTargetsEnforcer.sol";
import "../src/delegation/enforcers/AllowedMethodsEnforcer.sol";
import "../src/delegation/enforcers/TimestampEnforcer.sol";
import "../src/delegation/enforcers/LimitedCallsEnforcer.sol";
import "../src/delegation/enforcers/NativeTokenPaymentEnforcer.sol";

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
        address rebalancerConfig;
        address uniswapHelper;
        address delegationManager;
        address allowedTargetsEnforcer;
        address allowedMethodsEnforcer;
        address timestampEnforcer;
        address limitedCallsEnforcer;
        address nativeTokenPaymentEnforcer;
        address strategyRegistry;
        address rebalanceExecutor;
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
        console.log("  Implementation:", address(oracleImpl));

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
        console.log("  Implementation:", address(configImpl));

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
        console.log("  Implementation:", address(uniswapHelperImpl));

        bytes memory uniswapInitData = abi.encodeWithSelector(
            UniswapHelper.initialize.selector,
            uniswapRouter,
            uniswapFactory
        );
        ERC1967Proxy uniswapProxy = new ERC1967Proxy(address(uniswapHelperImpl), uniswapInitData);
        deployment.uniswapHelper = address(uniswapProxy);
        console.log("  Proxy:", deployment.uniswapHelper);

        // ============================================
        // 4. Deploy DelegationManager (Non-upgradeable)
        // ============================================
        console.log("\n4. Deploying DelegationManager...");
        DelegationManager delegationManager = new DelegationManager();
        deployment.delegationManager = address(delegationManager);
        console.log("  Address:", deployment.delegationManager);

        // ============================================
        // 5. Deploy Caveat Enforcers (Non-upgradeable)
        // ============================================
        console.log("\n5. Deploying Caveat Enforcers...");

        AllowedTargetsEnforcer targetsEnforcer = new AllowedTargetsEnforcer();
        deployment.allowedTargetsEnforcer = address(targetsEnforcer);
        console.log("  AllowedTargetsEnforcer:", deployment.allowedTargetsEnforcer);

        AllowedMethodsEnforcer methodsEnforcer = new AllowedMethodsEnforcer();
        deployment.allowedMethodsEnforcer = address(methodsEnforcer);
        console.log("  AllowedMethodsEnforcer:", deployment.allowedMethodsEnforcer);

        TimestampEnforcer timestampEnforcer = new TimestampEnforcer();
        deployment.timestampEnforcer = address(timestampEnforcer);
        console.log("  TimestampEnforcer:", deployment.timestampEnforcer);

        LimitedCallsEnforcer callsEnforcer = new LimitedCallsEnforcer();
        deployment.limitedCallsEnforcer = address(callsEnforcer);
        console.log("  LimitedCallsEnforcer:", deployment.limitedCallsEnforcer);

        NativeTokenPaymentEnforcer paymentEnforcer = new NativeTokenPaymentEnforcer();
        deployment.nativeTokenPaymentEnforcer = address(paymentEnforcer);
        console.log("  NativeTokenPaymentEnforcer:", deployment.nativeTokenPaymentEnforcer);

        // ============================================
        // 6. Deploy StrategyRegistry (UUPS Proxy)
        // ============================================
        console.log("\n6. Deploying StrategyRegistry...");
        StrategyRegistry registryImpl = new StrategyRegistry();
        console.log("  Implementation:", address(registryImpl));

        bytes memory registryInitData = abi.encodeWithSelector(
            StrategyRegistry.initialize.selector,
            deployer
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInitData);
        deployment.strategyRegistry = address(registryProxy);
        console.log("  Proxy:", deployment.strategyRegistry);

        // ============================================
        // 7. Deploy RebalanceExecutor (UUPS Proxy)
        // ============================================
        console.log("\n7. Deploying RebalanceExecutor...");
        RebalanceExecutor executorImpl = new RebalanceExecutor();
        console.log("  Implementation:", address(executorImpl));

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
        // 8. Link Registry to Executor
        // ============================================
        console.log("\n8. Linking Registry to Executor...");
        StrategyRegistry(deployment.strategyRegistry).setRebalanceExecutor(deployment.rebalanceExecutor);
        console.log("  Registry linked to Executor");

        vm.stopBroadcast();

        // ============================================
        // 9. Output Deployment Summary
        // ============================================
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("PythOracle:", deployment.pythOracle);
        console.log("RebalancerConfig:", deployment.rebalancerConfig);
        console.log("UniswapHelper:", deployment.uniswapHelper);
        console.log("DelegationManager:", deployment.delegationManager);
        console.log("AllowedTargetsEnforcer:", deployment.allowedTargetsEnforcer);
        console.log("AllowedMethodsEnforcer:", deployment.allowedMethodsEnforcer);
        console.log("TimestampEnforcer:", deployment.timestampEnforcer);
        console.log("LimitedCallsEnforcer:", deployment.limitedCallsEnforcer);
        console.log("NativeTokenPaymentEnforcer:", deployment.nativeTokenPaymentEnforcer);
        console.log("StrategyRegistry:", deployment.strategyRegistry);
        console.log("RebalanceExecutor:", deployment.rebalanceExecutor);

        // ============================================
        // 10. Save Deployment to JSON
        // ============================================
        _saveDeployment(chainName, deployment);

        return deployment;
    }

    function _saveDeployment(string memory chainName, Deployment memory deployment) internal {
        string memory json = string.concat(
            '{\n',
            '  "', chainName, '": {\n',
            '    "pythOracle": "', vm.toString(deployment.pythOracle), '",\n',
            '    "rebalancerConfig": "', vm.toString(deployment.rebalancerConfig), '",\n',
            '    "uniswapHelper": "', vm.toString(deployment.uniswapHelper), '",\n',
            '    "delegationManager": "', vm.toString(deployment.delegationManager), '",\n',
            '    "allowedTargetsEnforcer": "', vm.toString(deployment.allowedTargetsEnforcer), '",\n',
            '    "allowedMethodsEnforcer": "', vm.toString(deployment.allowedMethodsEnforcer), '",\n',
            '    "timestampEnforcer": "', vm.toString(deployment.timestampEnforcer), '",\n',
            '    "limitedCallsEnforcer": "', vm.toString(deployment.limitedCallsEnforcer), '",\n',
            '    "nativeTokenPaymentEnforcer": "', vm.toString(deployment.nativeTokenPaymentEnforcer), '",\n',
            '    "strategyRegistry": "', vm.toString(deployment.strategyRegistry), '",\n',
            '    "rebalanceExecutor": "', vm.toString(deployment.rebalanceExecutor), '"\n',
            '  }\n',
            '}'
        );

        string memory filename = string.concat("deployments-", chainName, ".json");
        vm.writeFile(filename, json);
        console.log(string.concat("\nDeployment saved to ", filename));
    }
}
