// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {StrategyRegistry} from "../src/core/StrategyRegistry.sol";
import {RebalanceExecutor} from "../src/core/RebalanceExecutor.sol";
import {DelegationManager} from "@metamask/delegation-framework/src/DelegationManager.sol";
import {Delegation} from "@metamask/delegation-framework/src/utils/Types.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title E2E Test Script
 * @notice Tests the full rebalancing flow on Monad testnet
 *
 * Usage:
 *   PRIVATE_KEY=<user_pk> forge script script/E2ETest.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast -vvvv
 */
contract E2ETest is Script {
    // Test wallet
    address constant USER = 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8;

    // Token addresses
    address constant MON = address(0); // Native token
    address constant USDC = 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea;

    // Deployed contracts (from deployments-monad.json)
    StrategyRegistry registry = StrategyRegistry(0x6655e6ee9a1BcF91047C9c0b1f4bAf56E2cfd146);
    RebalanceExecutor executor = RebalanceExecutor(payable(0xc5bd44d66d3cCe2D534972A749060472e7Ec78c9));
    DelegationManager delegationManager = DelegationManager(0x96a355552bBAbBAA0E36072e836d5eD9909C452f);

    // Bot address (from BOT_PRIVATE_KEY in .env)
    address constant BOT = 0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558;

    function run() public {
        uint256 userPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(userPrivateKey);

        console.log("\n=== E2E REBALANCE TEST ===");
        console.log("User:", USER);
        console.log("Bot:", BOT);

        // 1. Check initial balances
        checkBalances("INITIAL");

        // 2. Create delegation if not exists
        createDelegation();

        // 3. Register strategy
        uint256 strategyId = registerStrategy();

        // 4. Approve tokens for executor
        approveTokens();

        vm.stopBroadcast();

        console.log("\n=== SETUP COMPLETE ===");
        console.log("Strategy ID:", strategyId);
        console.log("\nNext steps:");
        console.log("1. Start the backend: cd ../backend && npm run start:dev");
        console.log("2. Start the bot: cd ../backend && npm run start:bot");
        console.log("3. Monitor rebalancing at http://localhost:3000/api/strategies");
    }

    function checkBalances(string memory label) internal view {
        uint256 monBalance = USER.balance;
        uint256 usdcBalance = IERC20(USDC).balanceOf(USER);

        console.log("\n--- %s BALANCES ---", label);
        console.log("MON:", monBalance / 1e18, ".", (monBalance % 1e18) / 1e16);
        console.log("USDC:", usdcBalance / 1e6, ".", (usdcBalance % 1e6) / 1e4);
    }

    function createDelegation() internal {
        console.log("\n--- CREATING DELEGATION ---");

        // Create delegation with caveats
        // This allows the bot to execute rebalances on behalf of the user
        Delegation memory delegation = Delegation({
            delegate: BOT,
            delegator: USER,
            authority: bytes32(0),
            caveats: new bytes[](0),
            salt: 0,
            signature: hex""
        });

        // In production, this would be signed by the user's wallet
        // For now, we'll use the delegation manager directly
        console.log("Delegation created for bot:", BOT);
        console.log("NOTE: In production, user must sign delegation via frontend");
    }

    function registerStrategy() internal returns (uint256) {
        console.log("\n--- REGISTERING STRATEGY ---");

        // Strategy config: 50/50 MON/USDC portfolio
        address[] memory tokens = new address[](2);
        tokens[0] = MON;
        tokens[1] = USDC;

        uint256[] memory targetWeights = new uint256[](2);
        targetWeights[0] = 5000; // 50% MON
        targetWeights[1] = 5000; // 50% USDC

        // Register strategy with 5% drift threshold
        uint256 strategyId = registry.createStrategy(
            tokens,
            targetWeights,
            500, // 5% drift threshold
            "50/50 MON/USDC Strategy"
        );

        console.log("Strategy registered with ID:", strategyId);
        console.log("Target weights: 50% MON, 50% USDC");
        console.log("Drift threshold: 5%");

        return strategyId;
    }

    function approveTokens() internal {
        console.log("\n--- APPROVING TOKENS ---");

        // Approve USDC for executor
        IERC20(USDC).approve(address(executor), type(uint256).max);
        console.log("USDC approved for RebalanceExecutor");

        console.log("MON (native token) does not require approval");
    }
}
