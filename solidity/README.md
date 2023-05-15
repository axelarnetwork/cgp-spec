# Solidity CGP Reference Implementation

This folder contains the reference implementation of the [CGP protocol](../cgp-v1.md) in Solidity.

## Compile

```bash
npm ci

npm run build
```

## Design

[AxelarGateway](contracts/AxelarGateway.sol): The entrypoint for the CGP protocol. Interchain messages can be initiated by calling `callContract` method. The message will be relayed via Axelar network according to the custom authentication rules for the connection. On the destination chain, `execute` method is called to record an approval for the message. The app can then call `validateContractCall` to verify the approval and execute the contract call with the payload.

[AxelarAuthWeighted](contracts/auth/AxelarAuthWeighted.sol): The default authentication contract for Axelar network. It allows the sender to specify a list of validators and the corresponding weights. The message is approved if the sum of weights of the validators who have signed the message is greater than the threshold.

For an initial release of the Axelar Gateway contract on new smart contract platforms,
it is recommended to implement some upgradability mechanism to allow reacting to potential bugs.
If the VM doesn't support upgradability natively, additional contracts might be needed to support it (e.g. in solidity). Additionally, a multisig wallet (potentially an on-chain contract) will be needed to manage upgrades.
