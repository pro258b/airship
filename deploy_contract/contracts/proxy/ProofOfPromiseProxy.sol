// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @title ProofOfPromiseProxy
/// @notice Transparent proxy tailored for deploying ProofOfPromise implementation contracts.
/// @dev Prevents the admin from accidentally invoking fallback logic while enabling upgrade control.
contract ProofOfPromiseProxy is TransparentUpgradeableProxy {
    constructor(address logic, address admin, bytes memory data)
        TransparentUpgradeableProxy(logic, admin, data)
    {}
}