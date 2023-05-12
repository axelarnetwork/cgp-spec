// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { Proxy } from './util/Proxy.sol';

contract AxelarGatewayProxy is Proxy {
    constructor(address implementationAddress, address owner, bytes memory setupParams) Proxy(implementationAddress, owner, setupParams) {}

    function contractId() internal pure override returns (bytes32) {
        return keccak256('axelar-gateway');
    }
}
