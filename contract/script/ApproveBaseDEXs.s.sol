// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../src/RebalanceExecutor.sol";

/**
 * @title ApproveBaseDEXs
 * @notice Script to approve Base Mainnet DEX routers in RebalanceExecutor
 * @dev Run with: forge script script/ApproveBaseDEXs.s.sol --rpc-url base --broadcast --verify
 */
contract ApproveBaseDEXsScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address executorAddress = vm.envAddress("EXECUTOR_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        RebalanceExecutor executor = RebalanceExecutor(payable(executorAddress));

        // Base Mainnet DEX routers
        address zeroExProxy = 0x0000000000001fF3684f28c67538d4D072C22734;  // 0x Exchange Proxy
        address oneInchRouter = 0x111111125421cA6dc452d289314280a0f8842A65; // 1inch v6 Aggregation Router
        address paraswapAugustus = 0x6A000F20005980200259B80c5102003040001068; // ParaSwap Augustus v6.2

        // Approve 0x Exchange Proxy (CRITICAL - currently failing)
        executor.setDEXApproval(zeroExProxy, true);
        console.log("[1/3] Approved 0x Exchange Proxy:", zeroExProxy);

        // Approve 1inch Router (enabled in bot config)
        executor.setDEXApproval(oneInchRouter, true);
        console.log("[2/3] Approved 1inch Router:", oneInchRouter);

        // Approve ParaSwap Augustus (optional, disabled by default)
        executor.setDEXApproval(paraswapAugustus, true);
        console.log("[3/3] Approved ParaSwap Augustus:", paraswapAugustus);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Base Mainnet DEX Approval Complete ===");
        console.log("Chain: Base (8453)");
        console.log("RebalanceExecutor:", executorAddress);
        console.log("---");
        console.log("0x Exchange Proxy:", zeroExProxy, "- Approved");
        console.log("1inch Router:", oneInchRouter, "- Approved");
        console.log("ParaSwap Augustus:", paraswapAugustus, "- Approved");
    }
}
