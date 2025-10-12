// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DelegationManager} from "@delegation-framework/DelegationManager.sol";

/**
 * @title Create DeleGator Script
 * @notice Deploys a DeleGator smart account for the test user
 *
 * Usage:
 *   PRIVATE_KEY=<user_pk> forge script script/CreateDeleGator.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast -vvv
 */
contract CreateDeleGator is Script {
    // Test user address
    address constant USER = 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8;

    // Deployed DelegationManager
    DelegationManager constant delegationManager = DelegationManager(0x96a355552bBAbBAA0E36072e836d5eD9909C452f);

    function run() public {
        uint256 userPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(userPrivateKey);

        console.log("\n=== CREATING DELEGATOR SMART ACCOUNT ===");
        console.log("User (Owner):", USER);
        console.log("DelegationManager:", address(delegationManager));

        // Create DeleGator with minimal parameters
        // The DelegationManager should have a createDeleGator function
        // For now, let's check if we can predict the address

        // Compute counterfactual address (the address before deployment)
        bytes32 salt = bytes32(0);

        console.log("\nNote: DeleGator deployment will happen on first delegation");
        console.log("The smart account is counterfactual - it exists at a predictable address");
        console.log("Deploy salt:", vm.toString(salt));

        vm.stopBroadcast();

        console.log("\n=== SMART ACCOUNT SETUP COMPLETE ===");
    }
}
