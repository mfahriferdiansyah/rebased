// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/StrategyRegistry.sol";
import "../src/libraries/StrategyLibrary.sol";
import "./mocks/MockDeleGator.sol";

contract StrategyRegistryTest is Test {
    StrategyRegistry public registry;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public executor = address(0x3);

    // DeleGator smart accounts for users
    MockDeleGator public user1Delegator;
    MockDeleGator public user2Delegator;

    address public tokenA = address(0x10);
    address public tokenB = address(0x11);
    address public tokenC = address(0x12);

    function setUp() public {
        // Deploy implementation
        StrategyRegistry implementation = new StrategyRegistry();

        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(StrategyRegistry.initialize.selector, owner);
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        // Wrap proxy
        registry = StrategyRegistry(address(proxy));
        registry.setRebalanceExecutor(executor);

        // Deploy DeleGator smart accounts for test users
        user1Delegator = new MockDeleGator(user1, address(0)); // No delegation manager needed for registry tests
        user2Delegator = new MockDeleGator(user2, address(0));
    }

    function testCreateStrategy() public {
        vm.startPrank(user1);

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;

        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000; // 60%
        weights[1] = 4000; // 40%

        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Conservative");

        StrategyLibrary.Strategy memory strategy = registry.getStrategy(address(user1Delegator), 1);
        assertEq(strategy.id, 1);
        assertEq(strategy.owner, user1);
        assertEq(strategy.delegator, address(user1Delegator));
        assertEq(strategy.tokens.length, 2);
        assertEq(strategy.tokens[0], tokenA);
        assertEq(strategy.weights[0], 6000);
        assertTrue(strategy.isActive);
        assertEq(strategy.name, "Conservative");

        vm.stopPrank();
    }

    function testCreateMultipleStrategies() public {
        vm.startPrank(user1);

        address[] memory tokens1 = new address[](2);
        tokens1[0] = tokenA;
        tokens1[1] = tokenB;
        uint256[] memory weights1 = new uint256[](2);
        weights1[0] = 6000;
        weights1[1] = 4000;

        address[] memory tokens2 = new address[](3);
        tokens2[0] = tokenA;
        tokens2[1] = tokenB;
        tokens2[2] = tokenC;
        uint256[] memory weights2 = new uint256[](3);
        weights2[0] = 3333;
        weights2[1] = 3333;
        weights2[2] = 3334;

        registry.createStrategy(address(user1Delegator), 1, tokens1, weights1, 86400, "Conservative");
        registry.createStrategy(address(user1Delegator), 2, tokens2, weights2, 3600, "Aggressive");

        assertEq(registry.getUserStrategyCount(address(user1Delegator)), 2);

        uint256[] memory ids = registry.getUserStrategyIds(address(user1Delegator));
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);

        vm.stopPrank();
    }

    function testUpdateStrategy() public {
        vm.startPrank(user1);

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;
        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000;
        weights[1] = 4000;

        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Test");

        uint256[] memory newWeights = new uint256[](2);
        newWeights[0] = 7000;
        newWeights[1] = 3000;

        registry.updateStrategy(address(user1Delegator), 1, tokens, newWeights);

        StrategyLibrary.Strategy memory strategy = registry.getStrategy(address(user1Delegator), 1);
        assertEq(strategy.weights[0], 7000);
        assertEq(strategy.weights[1], 3000);

        vm.stopPrank();
    }

    function testPauseResumeStrategy() public {
        vm.startPrank(user1);

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Test");

        assertTrue(registry.getStrategy(address(user1Delegator), 1).isActive);

        registry.pauseStrategy(address(user1Delegator), 1);
        assertFalse(registry.getStrategy(address(user1Delegator), 1).isActive);

        registry.resumeStrategy(address(user1Delegator), 1);
        assertTrue(registry.getStrategy(address(user1Delegator), 1).isActive);

        vm.stopPrank();
    }

    function testDeleteStrategy() public {
        vm.startPrank(user1);

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Test");
        assertEq(registry.getUserStrategyCount(address(user1Delegator)), 1);

        registry.deleteStrategy(address(user1Delegator), 1);
        assertEq(registry.getUserStrategyCount(address(user1Delegator)), 0);

        vm.stopPrank();
    }

    function testOnlyExecutorCanUpdateLastRebalanceTime() public {
        vm.startPrank(user1);

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Test");
        vm.stopPrank();

        // User cannot update
        vm.prank(user1);
        vm.expectRevert();
        registry.updateLastRebalanceTime(address(user1Delegator), 1);

        // Executor can update
        vm.prank(executor);
        registry.updateLastRebalanceTime(address(user1Delegator), 1);
    }

    function testCannotCreateDuplicateStrategy() public {
        vm.startPrank(user1);

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Test");

        vm.expectRevert();
        registry.createStrategy(address(user1Delegator), 1, tokens, weights, 86400, "Test2");

        vm.stopPrank();
    }

    function testMultipleUsersIndependentStrategies() public {
        // User1 creates strategy
        vm.prank(user1);
        address[] memory tokens1 = new address[](2);
        tokens1[0] = tokenA;
        tokens1[1] = tokenB;
        uint256[] memory weights1 = new uint256[](2);
        weights1[0] = 6000;
        weights1[1] = 4000;
        registry.createStrategy(address(user1Delegator), 1, tokens1, weights1, 86400, "User1Strategy");

        // User2 creates strategy with same ID (independent)
        vm.prank(user2);
        address[] memory tokens2 = new address[](2);
        tokens2[0] = tokenB;
        tokens2[1] = tokenC;
        uint256[] memory weights2 = new uint256[](2);
        weights2[0] = 7000;
        weights2[1] = 3000;
        registry.createStrategy(address(user2Delegator), 1, tokens2, weights2, 3600, "User2Strategy");

        // Check independence
        StrategyLibrary.Strategy memory strategy1 = registry.getStrategy(address(user1Delegator), 1);
        StrategyLibrary.Strategy memory strategy2 = registry.getStrategy(address(user2Delegator), 1);

        assertEq(strategy1.owner, user1);
        assertEq(strategy2.owner, user2);
        assertEq(strategy1.delegator, address(user1Delegator));
        assertEq(strategy2.delegator, address(user2Delegator));
        assertEq(strategy1.weights[0], 6000);
        assertEq(strategy2.weights[0], 7000);
        assertEq(strategy1.tokens[0], tokenA);
        assertEq(strategy2.tokens[0], tokenB);
    }
}
