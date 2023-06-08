## Cross-Chain Gateway Protocol EVM Spec 

#### Uniquely referencing a transaction on the source chain.

For every transaction originated on the source chain, we assume there exists a unique identifier. Moreover, its uniqueness should preserved across all blockchains (no two transactions should ever have the same identifier even if the same user submits the same action across multiple chains). For instance, every EVM chain has a `txhash:index` that maybe be used as an identifier. Assuming all EVM chains use distinct `chain_id`s, then even a user with the same public key across multiple chains, submitting the same action, will produce unique identifiers.

When this property cannot be preserved, middleware systems or special purpose smart contracts need to enforce it by adding unique or pseudorandom nonces. The middleware listen for packets arriving at the gateways (the routers, often instantiated as smart contracts or at the consensus layer) and processes them. 

#### The smart contracts & events

On each chain, two (or more) contracts need to be instantiated, call them `Gateway` and `Verifier`. 
(We leave out the prover functions for now, assuming the intermediary gateways are )

The `Gateway` specifies the messages semantics for sending and receiving messages and `Verifier` specifies the validation rules that are applied to provide safety. `Verifier` contract logic may be upgraded or improved without requiring any interface changes, as the applications only need to speak to the `Gateway`.

1. DApps/users sending outgoing messages
```

    function callContract(
        string calldata destinationChain,
        string calldata destinationContractAddress,
        bytes calldata payload
    ) external {
        emit ContractCall(msg.sender, destinationChain, destinationContractAddress, keccak256(payload), payload);
    }

```

The above calls fully specify the `packet` with all relevant fields.

Furthermore, as discussed above, the transaction can be identified by its unique `txhash:index`.

2. Middleware, such as relayers and or network validators read events from the gateway that define the packet, and subsequently process them by preparing a message that needs to be posted on the destination chain.

Dealing with duplicate postings at the destination chain. Should be de-duped assuming every transaction is uniquely identifiable by its source hash/identifier.

3. Middleware posting incoming messages to the destination gateway for approval.

```
    function approveContractCall(bytes calldata params, bytes32 transactionId) external onlySelf {
        (
            string memory sourceChain,
            string memory sourceAddress,
            address contractAddress,
            bytes32 payloadHash,
            bytes32 sourceTxHash,
            uint256 sourceEventIndex
        ) = abi.decode(params, (string, string, address, bytes32, bytes32, uint256));

        _setContractCallApproved(transactionId, sourceChain, sourceAddress, contractAddress, payloadHash);
        emit ContractCallApproved(transactionId, sourceChain, sourceAddress, contractAddress, payloadHash, sourceTxHash, sourceEventIndex);
    }
```
The `transactionId` refers to the unique identifier of the transaction at the source chain, as described above. Ideally, it should match the identifier at the source for each of referencing, indexing, and tracing. 
The gateway marks the message as `approved`, which means it is ready to be executed.

4. Application receiving and executing messages.
```
    function validateContractCall(
        bytes32 transactionId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external override returns (bool valid) {
        bytes32 key = _getIsContractCallApprovedKey(transactionId, sourceChain, sourceAddress, msg.sender, payloadHash);
        valid = getBool(key);
        if (valid) _setBool(key, false);
    }
```
For executing the messages, application contract is responsible for calling `validateContractCall` on the destination gateway to validate the approval and only allow execution if it returns `true`. Gateway marks the message as `executed` once the validate function is called. It's up for the application to check that the gateway transaction has already been executed.

### Notes

* Assuming liveness of middleware, source and destination chains, the above semantics guarantee eventual unordered delivery. That is, packets can arrive out of order. This is important for interoperability across heterogeneous systems. Because the blockchains can be very much "out of sync" and multiple dApps can use the same gateway, we do not want one packet to hold many others.

* More sophisticated protocols, like 2-way calls, sends to multiple chains, sequenced execution can be built as `application-level` protocols on top of unordered semantics. (Think TCP on top of IP).

* How transactions are posted (and how gas is calculated) is excluded from the specifications. However, `anyone` is able to post message [no permissioned relayers] to guarantee high liveness. A middleware / relayer may batch multiple calls to save gas, or execute them based on any custom policy deemed needed.

### Instantiation

List of known discrepancies between the spec above and the [Solidity reference implementation](/cgp-spec/tree/main/solidity)the reference implementation. 
* `transactionId` is used instead of `commandId`. 

