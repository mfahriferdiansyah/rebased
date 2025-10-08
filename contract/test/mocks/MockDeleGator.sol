// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockDeleGator
 * @notice Mock MetaMask DeleGator for testing
 * @dev Simulates MetaMask smart account behavior
 */
contract MockDeleGator {
    address public owner;
    address public delegationManager;

    event Executed(address indexed target, uint256 value, bytes data);

    constructor(address _owner, address _delegationManager) {
        owner = _owner;
        delegationManager = _delegationManager;
    }

    /**
     * @notice Execute a call (simulates MetaMask DeleGator.execute)
     * @param target Contract to call
     * @param value Native token amount
     * @param data Calldata
     */
    function execute(address target, uint256 value, bytes calldata data) external payable {
        require(msg.sender == delegationManager || msg.sender == owner, "Not authorized");

        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        emit Executed(target, value, data);
    }

    /**
     * @notice Approve tokens for spending
     * @param token Token address
     * @param spender Spender address
     * @param amount Amount to approve
     */
    function approveToken(address token, address spender, uint256 amount) external {
        require(msg.sender == owner, "Not owner");
        IERC20(token).approve(spender, amount);
    }

    /**
     * @notice Allow receiving ETH
     */
    receive() external payable {}
}
