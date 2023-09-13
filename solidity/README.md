# Solidity CGP Reference Implementation

This folder contains the reference implementation of the [CGP protocol](../cgp-v1.md) in Solidity.

## Build

```bash
npm ci

npm run build

npm run test
```

## Design

[AxelarGateway](contracts/AxelarGateway.sol): The entrypoint for the CGP protocol. Interchain messages can be initiated by calling `callContract` method. The message will be relayed via Axelar network according to the custom authentication rules for the connection. On the destination chain, `execute` method is called to record an approval for the message.

[AxelarAuthWeighted](contracts/auth/AxelarAuthWeighted.sol): The authentication contract . It allows the sender to specify a list of validators and the corresponding weights. The message is approved if the sum of weights of the validators who have signed the message is greater than the threshold.

[AxelarExecutable](contracts/executable/AxelarExecutable.sol): A common interface for Axelar powered apps. A relayer can trigger the `execute` method of the app, which will validate if an approval for the payload has been recorded at the gateway, and then execute the custom app logic.

Auxiliary contracts might include an ability to upgrade the gateway contract, and a multisig smart contract wallet to manage upgrades of the gateway.

## Cross-chain contract call flow

Here's a detailed breakdown of a real-world cross-chain [contract call](https://axelarscan.io/gmp/0x93cb0b614b07d6050b164cc3e35da617a2fbefc13069a35369894cac74b861a2:54).

1. Setup:
   a. Destination app contract implements the `IAxelarExecutable.sol` interface to receive the message.
   b. Destination app contract stores the destination gateway address.
2. Smart contract on source chain [calls](https://moonscan.io/tx/0x93cb0b614b07d6050b164cc3e35da617a2fbefc13069a35369894cac74b861a2) `AxelarGateway.callContract()` with the destination chain/address, and `payload`, which emits the `ContractCall` event.
3. Smart contract can also optionally deposit tokens to the [AxelarGasService](https://github.com/axelarnetwork/axelar-cgp-solidity/blob/main/contracts/gas-service/AxelarGasService.sol#L122) in the same tx to pay Axelar’s relayer for submitting all the intermediate txs for the cross-chain call execution.
4. A relayer monitors this event and submits a tx on Axelar to request validation. It also stores the `payload` in a traditional database, keyed by the `hash(payload)` to be retrieved later for execution on the destination.
5. Axelar validators [vote](https://axelarscan.io/evm-poll/434420) on the `ContractCall` event content on-chain.
6. A relayer requests the Axelar network to prepare a command batch which includes the pending payload approval (potentially along with other unrelated messages) and requests validators to sign it.
7. A signed [batch](https://axelarscan.io/evm-batches?commandId=0x47d0de91330856d70caecf442341be3faf6e644b83892b214c5a2bcc673ba8ca) of payload approvals is prepared on Axelar that anyone can see.
8. This is [submitted](https://bscscan.com/tx/0x72e6c040bfbf26073cdcf55cc4db571badcadd3b9316cf0f53b72f980d3e5100) to the gateway contract on the destination chain by a relayer (can be anyone), which records the [approval](https://github.com/axelarnetwork/cgp-spec/blob/main/solidity/contracts/AxelarGateway.sol#L109) of the payload hash and emits the [event](https://github.com/axelarnetwork/cgp-spec/blob/main/solidity/contracts/AxelarGateway.sol#L144) `ContractCallApproved`.
9. A relayer service (can be anyone) listens to this event on the destination gateway contract, and [calls](https://bscscan.com/tx/0x24886831c6348f036be26193d3fd74f2a08b9b9c10cae4e4bb99677687d8b71f) the `IAxelarExecutable.execute()` on the destination app contract, with the `payload` and other data as params.
10. `execute` of the destination app [contract](https://github.com/axelarnetwork/cgp-spec/blob/main/solidity/contracts/executable/AxelarExecutable.sol#L18) verifies that the contract call was indeed approved by Axelar validators by calling `AxelarGateway.validateContractCall()` on the destination gateway contract.
11. The gateway contract [records](https://github.com/axelarnetwork/cgp-spec/blob/main/solidity/contracts/AxelarGateway.sol#L60) that the destination app contract has validated the approval, to not allow `validateContractCall` to be called again (to prevent replay of `execute`).
12. The destination app contract uses the `payload` to [execute](https://github.com/axelarnetwork/cgp-spec/blob/main/solidity/contracts/executable/AxelarExecutable.sol#L23) it’s own logic.
