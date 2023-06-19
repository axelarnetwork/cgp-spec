# Cross-Chain Gateway Protocol Cosmwasm Spec 

## Uniquely referencing a transaction on the source chain.

For every transaction originated on the source chain, we assume there exists a unique identifier, `id`. Moreover, its uniqueness should be preserved across all blockchains (no two transactions should ever have the same identifier even if the same user submits the same action across multiple chains). For instance, every EVM chain has a `txhash:index` that maybe be used as an identifier. Assuming all EVM chains use distinct `chain_id`s, then even a user with the same public key across multiple chains, submitting the same action, will produce unique identifiers.

When this property cannot be preserved, middleware systems or special purpose smart contracts need to enforce it by adding unique or pseudorandom nonces. The middleware listen for packets arriving at the gateways (the routers, often instantiated as smart contracts or at the consensus layer) and processes them. 

## The smart contracts & events

On each chain, two (or more) contracts need to be instantiated, call them `Gateway` and `Verifier`, and potentially a `Prover`. 

The `Gateway` specifies the messages semantics for sending and receiving messages and `Verifier` specifies the validation rules that are applied to provide safety, and `Prover` specifies the type of proof that might need to be generated for outgoing messages. `Verifier` and `Prover` contracts logic may be upgraded or improved without requiring any interface changes, as the applications only need to speak to the `Gateway`.


Message format
```
pub struct Message {
    pub source_address: String,
    pub source_chain: String,
    pub destination_address: String,
    pub destination_chain: String,
    pub payload_hash: HexBinary,
    pub id: String (optional), 
    // The ID must be unique across all TXs / all chains. Depending on how the gateway is instantiated and semantics of the chain, this ID might be not possible to derive until the transaction is included in a block. In that case the middleware / validation layer needs to append it.    
}
```

Gateway interfaces
```
pub trait Gateway{
	Verify([]Message: msgs)
	Route([]Message: msgs)    
    CallContract(string: destination chain, string: destination address, []byte payload)
    Execute(string: msg_id, []byte: payload)
}
```

### Example: Avalanche → Moonbeam

A user calls `CallContract` with the appropriate payload on Avalanche. The gateway prepares the routing message and sends the payload to a payload verifier. Then it calls its own `Route` function. `Route` in turn calls `Verify`, which checks if the previously mentioned payload verifier has seen the payload and therefore returns `true`. The destination is not Avalanche and there is no router registered on Avalanche, so `Route` just emits a routing event and is done. Axelarons relayers listen for the routing event, pick up the message and broadcast it to `gateway.Route(msg)` on axelarnet. Routing on axelarnet is blocked until the voting verifiers are done with their confirmation, after which `gateway.Route(msg)` calls `router.Route(msg)` on the registered router contract. The router finds the Moonbeam gateway and calls `gateway.Route(msg)` on it. It’s still not the correct chain, but the gateway was called by the router, so there is no need for verification. Thus, the gateway again relies on relayers. Finally, relayers call `gateway.Route(msg)` on Moonbeam after the verifier validated the multisig proof from axelarnet. Because the destination chain matches Moonbeam, stores the message as routed in preparation for the `Execute` call. Once `Execute` is called the message is marked as executed and to prevent double spending.

### Example: Ethereum → Arbitrum

A user calls `CallContract` with the appropriate payload on Ethereum. The gateway prepares the routing message and sends the payload to a payload verifier. Then it calls its own `Route` function. `Route` in turn calls `Verify`, which checks if the previously mentioned payload verifier has seen the payload and therefore returns `true`. The destination is not Ethereum, but there is a router registered, so it calls `router.Route(msg)`. The router finds the Arbitrum gateway and calls `gateway.Route(msg)` on it. It’s called by the router, so it’s automatically verified. This gateway can make use of the native L2 bridge to arbitrum, so it directly calls its Arbitrum gateway counterpart. Similarly, the gateway on Arbitrum can skip verification because it’s called by a trusted source. The message has reached the destination chain, so the gateway marks it as routed and waits for `Execute` to be called before marking the message as executed.

## Diagram

![routing flow diagram.png](images/routing_flow_diagram.png)

## Instantiation

TODO.
