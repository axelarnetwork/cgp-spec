# Axelar CGP Solidity Implementation Details

The Axelar Chross-Chain Gateway Protocol (CGP) enables cross-chain communication between EVM compatible blockchains. This is achieved using a decentralized network of validators that act as an integration point, relaying messages between the source blockchain and the destination blockchain.

In this document, we will discuss the protocol implementation, with an emphasis on the general terms and established naming conventions.

## AxelarAuthWeighted Contract

The `AxelarAuthWeighted` contract is responsible for validating and maintaining the state of validators. Validators are authenticated based on the `validateProof` function, where the proof is a unique signature calculated using a subset of validators' keys.

1. `validateProof(bytes32 messageHash, bytes calldata proof) external view returns (bool)`: This function takes a `messageHash` and a `proof` as input. It validates the proof and reverts if the proof is invalid and ensures the threshold for validation is met via signature weights. The threshold is the minimum total weight required for validation to be successful. Returns true if the provided operators are the current ones.

2. `transferOperatorship(bytes calldata params) external onlyOwner`: This method is accessible only by the owner of the contract. It transfers operatorship to new operators based on the passed parameters.

## AxelarGateway Contract

The `AxelarGateway` contract enables message dispatch from the source blockchain and dispatch validation on the destination chain. Identified via a unique `commandId`, messages are determined if they have already been executed or not to avoid duplication.

Using the `execute` function, it processes commands received from the Axelar network, verifying the validity and ensuring they come from the authorised operators.

1. `callContract(string calldata destinationChain, string calldata destinationContractAddress, bytes calldata payload) external`: It emits a `ContractCall` event, which a relay picks up to forward the payload to the destination chain.

2. `isContractCallApproved(bytes32 commandId, string calldata sourceChain, string calldata sourceAddress, address contractAddress, bytes32 payloadHash) external view override returns (bool)`: Checks if a contract call with a specific payload has been approved.

3. `validateContractCall(bytes32 commandId, string calldata sourceChain, string calldata sourceAddress, bytes32 payloadHash) external override returns (bool)`: Validates if contract call is approved and marks it as executed to avoid re-execution.

4. `execute(bytes calldata input) external override`: Execute commands received from the Axelar network.

5. `approveContractCall(bytes calldata params, bytes32 commandId) external onlySelf`: Approves contract calls and emits a ContractCallApproved event.

6. `transferOperatorship(bytes calldata newOperatorsData, bytes32) external onlySelf`: Transfers operatorship to new operators.

For contract calls and operatorship transfers, these commands are executed within self-calls for security considerations against possible revert scenarios.

## AxelarExecutable Contract

The `AxelarExecutable` contract is the hook for end-user Dapps to extend and add the functionality required for their specific use-cases. The contract interfaces with the `AxelarGateway` and provides placeholders for executing commands specific to the Dapps in an overridable method `_execute`.

1. `execute(bytes32 commandId, string calldata sourceChain, string calldata sourceAddress, bytes calldata payload) external`: Execute an interchain contract call after validating that an approval for it is recorded at the gateway

2. `_execute(string calldata sourceChain, string calldata sourceAddress, bytes calldata payload) internal virtual`: Placeholder function meant to be overridden by the app to add the desired functionality.

## Command Execution flow

After the collection, dispatch, and processing of messages, the Axelar network sends validated commands to the destination blockchain. These are directed into the `AxelarGateway`, which is responsible for validating and executing these commands. Full command execution is broken down into several steps:

**1. Command Reception:**

The `AxelarGateway` contract's `execute` function receives an external call that contains encoded data and proof.
The data is composed of multiple commands, each containing the command ID, command name, and parameters. The proof is a cryptographic confirmation that the command comes from the Axelar network.

**2. Proof and Data Decoding:**

The received proof and encoded data are then decoded within the `execute` function. The data includes the chain ID, an array of command IDs, command names, and associated parameters.

**3. Command Validation:**

Each command is then checked against its ID on the blockchain to avoid re-execution of already-completed commands. If a command is marked as executed, it's skipped, preventing any form of duplication or replay attacks.

**4. Command Execution:**

For validated and approved commands, a corresponding function within the `AxelarGateway` is called. These functions are determined and called dynamically using ABI encoding and built-in Solidity function selectors.

The two primary function calls within `AxelarGateway` are:

- `approveContractCall`, which sets command's approval state and emits an `ContractCallApproved` event.
- `transferOperatorship`, which delegates the operatorship to new operators and emits an `OperatorshipTransferred` event.

While these functions encapsulate core `AxelarGateway` operations, the protocol's flexibility stems from the `AxelarExecutable` contract.

**5. AxelarExecutable Contract:**

The `AxelarExecutable` contract functions as an interface between end-user Dapps and the `AxelarGateway`. Developers can extend `AxelarExecutable` and implement custom contract hooks to integrate their logic with executed commands.

The primary function in the `AxelarExecutable` contract is the `execute` function which verifies that the command execution request matches a previously registered and approved command in the `AxelarGateway` before executing it.
The function `_execute` is a placeholder for developers to build their logic on top of the protocol.
By overriding the `_execute` function, developers can interface directly with the incoming Axelar messages and interpret them according to their Dapp's requirements.

## Conclusion

The Axelar CGP protocol offers a highly scalable mechanism for communication between blockchains. By ensuring message authenticity, validity, and maintaining state between chains, it enables a highly reliable cross-chain communication.

Please note that this documentation provides a summary of the protocol and its intended use. For a detailed understanding of the protocol, please refer to the contract code discussed above in the given context.