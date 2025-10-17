// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../src/RebalanceExecutor.sol";

/**
 * @title ApproveDEXs
 * @notice Script to approve DEX routers in RebalanceExecutor
 */
contract ApproveDEXsScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address executorAddress = vm.envAddress("EXECUTOR_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        RebalanceExecutor executor = RebalanceExecutor(payable(executorAddress));

        // Approve Monorail router
        address monorailRouter = 0x525B929fCd6a64AfF834f4eeCc6E860486cED700;
        executor.setDEXApproval(monorailRouter, true);
        console.log("Approved Monorail router:", monorailRouter);

        // Approve Uniswap V2 router
        address uniswapV2Router = vm.envAddress("UNISWAP_V2_ROUTER");
        executor.setDEXApproval(uniswapV2Router, true);
        console.log("Approved Uniswap V2 router:", uniswapV2Router);

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEX Approval Complete ===");
        console.log("Monorail:", monorailRouter, "- Approved");
        console.log("Uniswap V2:", uniswapV2Router, "- Approved");
    }
}
