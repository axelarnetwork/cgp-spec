// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

// General interface for upgradable contracts
interface IUpgradable {
    error InvalidCodeHash();
    error InvalidImplementation();
    error SetupFailed();
    error NotProxy();

    event Upgraded(address indexed newImplementation);
    event OwnershipTransferred(address indexed newOwner);

    function contractId() external pure returns (bytes32);

    function implementation() external view returns (address);

    function upgrade(address newImplementation, bytes32 newImplementationCodeHash, bytes calldata params) external;

    function setup(bytes calldata data) external;
}
