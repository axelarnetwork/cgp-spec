# Solidity CGP Reference Implementation

This folder contains the reference implementation of the [CGP protocol](../cgp-v1.md) in Solidity.

## Compile

```bash
npm ci

npm run build
```

## Design

[AxelarGateway](contracts/AxelarGateway.sol): The entrypoint for the CGP protocol. Interchain messages can be initiated by calling `callContract` method. The message will be relayed via Axelar network according to the custom authentication rules for the connection. On the destination chain, `execute` method is called to record an approval for the message.

[AxelarAuthWeighted](contracts/auth/AxelarAuthWeighted.sol): The authentication contract . It allows the sender to specify a list of validators and the corresponding weights. The message is approved if the sum of weights of the validators who have signed the message is greater than the threshold.

[AxelarExecutable](contracts/executable/AxelarExecutable.sol): A common interface for Axelar powered apps. A relayer can trigger the `execute` method of the app, which will validate if an approval for the payload has been recorded at the gateway, and then execute the custom app logic.

Auxiliary contracts might include an ability to upgrade the gateway contract, and a multisig smart contract wallet to manage upgrades of the gateway.
