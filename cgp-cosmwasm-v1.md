## Cross-Chain Gateway Protocol Cosmwasm Spec 

#### Uniquely referencing a transaction on the source chain.

For every transaction originated on the source chain, we assume there exists a unique identifier, `id`. Moreover, its uniqueness should preserved across all blockchains (no two transactions should ever have the same identifier even if the same user submits the same action across multiple chains). For instance, every EVM chain has a `txhash:index` that maybe be used as an identifier. Assuming all EVM chains use distinct `chain_id`s, then even a user with the same public key across multiple chains, submitting the same action, will produce unique identifiers.

When this property cannot be preserved, middleware systems or special purpose smart contracts need to enforce it by adding unique or pseudorandom nonces. The middleware listen for packets arriving at the gateways (the routers, often instantiated as smart contracts or at the consensus layer) and processes them. 

#### The smart contracts & events

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

For all incoming messages, the gateway stores the map representing: `[id, Hash(Message) : status = (received | verified | executed)]`. 
Details on the statuses are specified below. 

0. Setup

The gateway is deployed on a chain with references to `Verifier` and `Prover` contracts. 

1. DApps sending outgoing messages
```
use connection_router::types::Message;
use cosmwasm_schema::{cw_serde, QueryResponses};

#[cw_serde]
pub enum ExecuteMsg{
    // For lazy pulls from the router contract, a shim contract can be used on top of the gateway that pulls from router and calls the gateway. 
    // TODO: add / emit event for the message. 
    // The function may store the messages within the gateway or simply emit an event.    
    SendMessages { messages: Vec<Message> }, 
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(Vec<Message>)]
    GetMessages { message_ids: Vec<String> },
}
```

2. Middleware, such as relayers and or network validators read events from the gateway that define the packet, and subsequently process them by preparing a message that needs to be posted on the destination chain.

3. Middleware posting incoming messages to the destination gateway for approval.

```

use connection_router::msg::Message;
use cosmwasm_schema::cw_serde;

#[cw_serde]
pub enum ExecuteMsg {
    // Middleware posts a vector of messages. 
    // Returns a vector of true/false values for each passed in message, indicating current verification status
    // TODO: Pass IDs? 
    ReceiveMessages {  messages: Vec<Message> },
}
```

After this method, the message is status is either received or verified.
`[id, Hash(Message) : status = (received | verified)]`

Message received, simply means that it was posted / relayed, but not verified by the validation layer yet. [The receive method calls the verifier contract to check if the message is verified]. Separately, the `Verifier` contract exposes a function to receive proofs & verify messages and calls-back the gateway to change the status `received->verified` when needed. 

TODO. Fill-in interface between gateway & verified.  

4. Application receiving and executing messages.
```
    // For each message, sends message to the router if fully verified
    // Can be instantiated lazily (called by external contracts to mark messages as executed) or explicitly calling external contracts. 
    ExecuteMessages { messages: Vec<Message> },
```

// TODO: need a query to check if a TX has been executed. 

After executing a message, it's marked as `executed`. Note the message status can only be updated following this state transition `received -> verified -> executed`. Once the message is executed, its status cannot be changed. 

### Instantiation

TODO.
