// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IYieldAdapter
/// @notice Minimal interface for yield adapters used by ProofOfPromise.
interface IYieldAdapter {
    /// @dev Deposits `amount` of `asset` and returns minted share quantity.
    function deposit(address asset, uint256 amount) external payable returns (uint256 sharesMinted);

    /// @dev Withdraws `shares` to the `recipient` and returns the underlying amount released.
    function withdraw(address asset, uint256 shares, address recipient) external returns (uint256 amountWithdrawn);
}