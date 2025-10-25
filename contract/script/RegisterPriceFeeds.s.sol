// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../src/interfaces/IPythOracle.sol";

/**
 * @title RegisterPriceFeeds
 * @notice Register verified Pyth price feeds on PythOracle contract
 * @dev Run with: forge script script/RegisterPriceFeeds.s.sol:RegisterPriceFeeds --rpc-url $RPC --broadcast --private-key $PRIVATE_KEY
 */
contract RegisterPriceFeeds is Script {
    // Base Sepolia PythOracle
    address constant PYTH_ORACLE = 0x324b6E527ffc765B2A2Fd6B9133dA0FF8d31d6Fc;

    // Verified tokens with Pyth feeds (from tokens-base-sepolia-with-pyth.json)
    struct TokenFeed {
        address token;
        bytes32 feedId;
        string symbol;
    }

    function run() external {
        // Build token feed array
        TokenFeed[] memory feeds = new TokenFeed[](4);

        // ETH (Native) - ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
        feeds[0] = TokenFeed({
            token: 0x0000000000000000000000000000000000000000,
            feedId: 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace,
            symbol: "ETH"
        });

        // WETH - 9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6
        feeds[1] = TokenFeed({
            token: 0x4200000000000000000000000000000000000006,
            feedId: 0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6,
            symbol: "WETH"
        });

        // DEGEN - 9c93e4a22c56885af427ac4277437e756e7ec403fbc892f975d497383bb33560
        feeds[2] = TokenFeed({
            token: 0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed,
            feedId: 0x9c93e4a22c56885af427ac4277437e756e7ec403fbc892f975d497383bb33560,
            symbol: "DEGEN"
        });

        // AXL - 60144b1d5c9e9851732ad1d9760e3485ef80be39b984f6bf60f82b28a2b7f126
        feeds[3] = TokenFeed({
            token: 0x23ee2343B892b1BB63503a4FAbc840E0e2C6810f,
            feedId: 0x60144b1d5c9e9851732ad1d9760e3485ef80be39b984f6bf60f82b28a2b7f126,
            symbol: "AXL"
        });

        IPythOracle oracle = IPythOracle(PYTH_ORACLE);

        console.log("========================================");
        console.log("Registering Price Feeds on PythOracle");
        console.log("========================================");
        console.log("Chain: Base Sepolia (84532)");
        console.log("PythOracle:", PYTH_ORACLE);
        console.log("Tokens to register:", feeds.length);
        console.log("");

        // Check current state BEFORE registration
        console.log("BEFORE Registration:");
        for (uint256 i = 0; i < feeds.length; i++) {
            bytes32 currentFeed = oracle.priceFeeds(feeds[i].token);
            bool isRegistered = currentFeed != bytes32(0);
            console.log(
                string.concat(
                    "  ",
                    feeds[i].symbol,
                    " (",
                    vm.toString(feeds[i].token),
                    "): ",
                    isRegistered ? "REGISTERED" : "NOT REGISTERED"
                )
            );
        }

        // Start broadcast
        vm.startBroadcast();

        // Register each feed
        console.log("\nRegistering feeds...");
        for (uint256 i = 0; i < feeds.length; i++) {
            console.log(string.concat("  Setting ", feeds[i].symbol, "..."));
            oracle.setPriceFeed(feeds[i].token, feeds[i].feedId);
        }

        vm.stopBroadcast();

        // Verify registration
        console.log("\nAFTER Registration:");
        for (uint256 i = 0; i < feeds.length; i++) {
            bytes32 registeredFeed = oracle.priceFeeds(feeds[i].token);
            bool matches = registeredFeed == feeds[i].feedId;
            string memory status = matches ? "OK" : "MISMATCH";

            console.log(
                string.concat(
                    "  ",
                    feeds[i].symbol,
                    " (",
                    vm.toString(feeds[i].token),
                    "): ",
                    status
                )
            );

            if (!matches) {
                console.log(string.concat("    Expected: ", vm.toString(feeds[i].feedId)));
                console.log(string.concat("    Got:      ", vm.toString(registeredFeed)));
            }
        }

        console.log("\n========================================");
        console.log("Price Feed Registration Complete!");
        console.log("========================================");
    }
}
