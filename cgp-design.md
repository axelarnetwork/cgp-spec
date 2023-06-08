## Cross-Chain Gateway Protocol Design Goals 

### Background

The cross-chain gateway protocol specifies message and packet semantics necessary to establish end-to-end cross-blockchain communication. The interface allows dApps to rely on established message semantics. The protocol has been designed adhering to simple principles of network connectivity to satisfy high modularity, support innovation at the consensus and interoperability layers, while allowing developers to build `future-proof` dApps.

Robust interoperability unifies developer experiences, allowing developers to build on the best stack for their use case & still compose with other ecosystems. Furthermore, it gives the power to developers to build dApps with simple UX, allowing any user to interact with chain with 1-click.

Principles of network connectivity were studied for decades during the development of the Internet. As a result of decades of research and experimentation, the Internet Protocol was born. Its simple, elegant, and still powers all of Internet communication. We define a similarly simple protocol to abstract interoperability across blockchains. It's designed with the same core principles and allows innovation in blockchain layers to continuing evolving. 

### Design Goals

We summarize four properties of network connectivity following Cerf and Kahn'74 with additional blockchain specific properties.

1.  No changes are required to integrate. Each distinct network needs to stand on its own, and no internal changes need to be required to any such network to connect it.
2. Gateway-based connectivity. Individual blockchains should connect to other networks via black boxes (gateways). These black boxes retain no information about the individual packet flows passing through them, thereby keeping them simple and avoiding complicated adaptation and recovery from various failure modes.
3. Best-effort intermediate communication. Communication is done on a best effort basis. If a packet does not reach the final destination, it will be retransmitted shortly from the source.
4. Decentralized control. There should be no global control at the operations level.

We introduce two additional properties necessary in the context of cross-blockchain communication.

5. Cross-chain Safety. Given chains A & B, an interoperability protocol P, and a transaction TX between them [e. g., source=A, destination=B], P(TX) = true at the destination chain iff TX is accepted and finalized by the source chain.
6. Eventual Liveness. Given chains A & B, an interoperability protocol P, and a transaction TX between them [e. g., source=A, destination=B] that is finalized on the source chain, TX will eventually be delivered to the destination chain. (Assuming underlying liveness properties of A, B & P).


### The Three Interoperability Layers

Interoperability in blockchains is centered around defining 3 layers: message semantics, validation, and transport.
Message semantics refers to the "header of envelope" to send messages from one chain to another, and the format of their delivery. This is the layer that applications interact with. Below it, are validation and transport mechanics of interoperability protocols. Validation specifies how the messages are authenticated to establish trust. It can be native (using light-clients like in IBC) or external (using multi-sigs, optimistic, or decentralized validator networks). Application shall not need to interact with "internals" of these layers, but they rely on them for safety and liveness.

### Mapping Interop Layers to Design Goals

| Layer        | Design Goals   |
| :------------- |:-------------|
| Message semantics      | No changes are required to integrate <br /> Gateway-based connectivity |
| Validation      | Cross-chain safety      |
| Transport | Eventual liveness <br /> Best effort intermediate communication |

To physically relay packets across chains you need some form of ``middleware''. If light-clients are used for validation, the middleware can be untrusted (aka relayers) and provide liveness only. Alternative, the externally instantiated validation layer would rely on middleware to produce proofs which relayers post across chains. 

#### Uniquely referencing a transaction on the source chain.

Throughout the specifications, for every transaction originated on the source chain, we assume there exists a unique identifier. Moreover, its uniqueness should preserved across all blockchains (no two transactions should ever have the same identifier even if the same user submits the same action across multiple chains). For instance, every EVM chain has a `txhash:index` that maybe be used as an identifier. Assuming all EVM chains use distinct `chain_id`s, then even a user with the same public key across multiple chains, submitting the same action, will produce unique identifiers.

When this property cannot be preserved, middleware systems or special purpose smart contracts need to enforce it by adding unique or pseudorandom nonces. The middleware listen for packets arriving at the gateways (the routers, often instantiated as smart contracts or at the consensus layer) and processes them. 

