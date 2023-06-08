# Cross-Chain Gateway Protocol Specifications

Specification of Cross-Chain Gateway Protocol (CGP) that can be used to guide semantics of the smart contracts, relayers, and validation logic to establish end-to-end cross-chain dApp message passing and composability. 

The following components must be implemented to support the Cross-Chain Gateway Protocol for a new chain A: 

* A gateway on the chain A. It's typically written in the smart contract language of that chain or it may be implemented at the consensus layer.
* A gateway on the Axelar network if you want to plug in to all N of its interconnected chains via a router. (Alternatively, you could implement a gateway on any other destination chain B, if you're looking for a pairwise connectivity to a single chain. The benefit connecting to the Axelar network is that you get access to N network, at the cost of implementing a single connection). 
* Middleware to connect the gateway. The middleware may provide trustless relaying only or validation with relaying [see the spec](cgp-v1.md).

If you're building a gateway on the Axelar network, you'll need to connect to one of its `routers` and establish a connection for forwarding packets in/out of your network. 

CGP establishes the simplest packet semantics possible to establish robust and future-proof connectivity. You can watch a [talk at Stanford University](https://www.youtube.com/watch?v=6XFMzdXV_I4) on some of its design principles and read [the design document](cgp-design.md). 

At the core, CGP supports innovation at all layers of the stack: the protocol is free and does not introduce any vendor locking, it's consensus agnostic allowing L1/L2/L3 innovation, and simple to build and operate. You can build more complex semantics on top of it, like IBC, reliable delivery, multi-sends, etc. 

![Alt text](images/flow-overview.png)

Table of content: 
* [The design principles](cgp-design.md)
* [EVM gateway v1](cgp-evm-v1.md) 
* [Cosmwasm gateway v1](cgp-cosmwasm-v1.md) (to be instantiated on the Axelar network or other Rust-based chains)
* [Router spec v1](cap-router-v1.md) (should be available on the Axelar network; your chain connections will interact with it to send messages to all other chains)

