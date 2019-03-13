# SDK for MXW blockchain

## Getting started
### 1. Install `mxw-sdk-js` package
If you want the latest, stable version, install the package from NPM.
```
npm install --save mxw-sdk-js
```

### 2. Use it in your project
```
// Load the SDK (with require)
const MxwApi = require('mxw-sdk-js')

// Load the SDK (with import)
// import MxwApi from 'mxw-sdk-js'

// Define all nodes from which SDK can choose one
// The following list of nodes represents the current MXW testnet
const NODES = [
    'ws://node-1.testnet.space:26657',
    'ws://node-2.testnet.space:26657',
    'ws://node-3.testnet.space:26657',
    'ws://node-4.testnet.space:26657',
    'ws://node-5.testnet.space:26657',
    'ws://node-6.testnet.space:26657',
    'ws://node-7.testnet.space:26657',
    'ws://node-8.testnet.space:26657',
    'ws://node-9.testnet.space:26657',
    'ws://node-10.testnet.space:26657',
]

// Define the indexing service endpoint
// The provided URL is the Indexing service used by the testnet
const INDEXER = 'http://services.testnet.space:1234'

// Instantiate the SDK
const API = new MxwApi({
    nodes: NODES,
    indexer: INDEXER,
    backend: 'cosmos',
})
```

## Tips
You can find detailed usage examples in the `examples` folder.

- Alias / [`examples/alias.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/alias.js)
- Events / [`examples/events.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/events.js)
- Faucet / [`examples/faucet.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/faucet.js)
- KYC / [`examples/kyc.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/kyc.js)
- Transfer / [`examples/transfer.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/transfer.js)
- Utilities / [`examples/util.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/util.js)

## API reference / Features
>MXW SDK module

**Kind**: global namespace  
**Version**: 0.1.1  

* [mxw](#mxw) : <code>object</code>
    * [.events](#mxw.events) : <code>object</code>
        * [~onTx(fnc)](#mxw.events..onTx)
        * [~onBlock(fnc)](#mxw.events..onBlock)
        * [~removeHandler(type)](#mxw.events..removeHandler)
    * [.main](#mxw.main) : <code>object</code>
        * [~balance(address)](#mxw.main..balance) ⇒ <code>Promise</code>
        * [~transfer(privateKey, address)](#mxw.main..transfer) ⇒ <code>Promise</code>
        * [~signTransfer(privateKey, address)](#mxw.main..signTransfer) ⇒ <code>Promise</code>
    * [.util](#mxw.util) : <code>object</code>
        * [~getAddressByPrivateKey(privateKey)](#mxw.util..getAddressByPrivateKey) ⇒ <code>string</code>
        * [~getAddressByPublicKey(publicKey)](#mxw.util..getAddressByPublicKey) ⇒ <code>string</code>
        * [~generateKeyPair()](#mxw.util..generateKeyPair) ⇒ <code>object</code>
        * [~getAddressFromPublicKeyByteArray(byteArray)](#mxw.util..getAddressFromPublicKeyByteArray) ⇒ <code>string</code>
        * [~decodeTx(encoded)](#mxw.util..decodeTx) ⇒ <code>object</code>
        * [~getSha256(str)](#mxw.util..getSha256) ⇒ <code>string</code>
        * [~getBlock(height)](#mxw.util..getBlock) ⇒ <code>Promise</code>
        * [~getTxsByHeight(height)](#mxw.util..getTxsByHeight) ⇒ <code>Promise</code>
        * [~getTx(hash)](#mxw.util..getTx) ⇒ <code>Promise</code>
        * [~getTxs(address)](#mxw.util..getTxs) ⇒ <code>Promise</code>
    * [.alias](#mxw.alias) : <code>object</code>
        * [~setAlias(privateKey, alias)](#mxw.alias..setAlias) ⇒ <code>Promise</code>
        * [~removeAlias(privateKey, alias)](#mxw.alias..removeAlias) ⇒ <code>Promise</code>
        * [~getAliasByAddress(address)](#mxw.alias..getAliasByAddress) ⇒ <code>Promise</code>
        * [~getAddressByAlias(alias)](#mxw.alias..getAddressByAlias) ⇒ <code>Promise</code>
    * [.kyc](#mxw.kyc) : <code>object</code>
        * [~requestWhitelist(privateKey, whitelistAddress)](#mxw.kyc..requestWhitelist) ⇒ <code>Promise</code>
        * [~isWhitelisted(address)](#mxw.kyc..isWhitelisted) ⇒ <code>Promise</code>
    * [.faucet](#mxw.faucet) : <code>object</code>
        * [~getStatus(address)](#mxw.faucet..getStatus) ⇒ <code>Promise</code>
        * [~requestCoins(privateKey, address)](#mxw.faucet..requestCoins) ⇒ <code>Promise</code>
    

<a name="mxw.events"></a>

### mxw.events : <code>object</code>
Events

**Kind**: static namespace of [<code>mxw</code>](#mxw)  
**Example**: [`examples/events.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/events.js)

* [.events](#mxw.events) : <code>object</code>
    * [~onTx(fnc)](#mxw.events..onTx)
    * [~onBlock(fnc)](#mxw.events..onBlock)
    * [~removeHandler(type)](#mxw.events..removeHandler)

<a name="mxw.events..onTx"></a>

#### events~onTx(fnc)
Set the new transaction handler.

**Kind**: inner method of [<code>events</code>](#mxw.events)  

| Param | Type | Description |
| --- | --- | --- |
| fnc | <code>function</code> | Function that will be called on every new transaction (format: (data) => {}) |

<a name="mxw.events..onBlock"></a>

#### events~onBlock(fnc)
Set the new block handler.

**Kind**: inner method of [<code>events</code>](#mxw.events)  

| Param | Type | Description |
| --- | --- | --- |
| fnc | <code>function</code> | Function that will be called on every new block (format: (data) => {}) |

<a name="mxw.events..removeHandler"></a>

#### events~removeHandler(type)
Removes a certain handler

**Kind**: inner method of [<code>events</code>](#mxw.events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Handler type ('tx'|'block') |

<a name="mxw.main"></a>

### mxw.main : <code>object</code>
Main

**Kind**: static namespace of [<code>mxw</code>](#mxw)  
**Example**: [`examples/transfer.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/transfer.js)

* [.main](#mxw.main) : <code>object</code>
    * [~balance(address)](#mxw.main..balance) ⇒ <code>Promise</code>
    * [~transfer(privateKey, address)](#mxw.main..transfer) ⇒ <code>Promise</code>
    * [~signTransfer(privateKey, address)](#mxw.main..signTransfer) ⇒ <code>Promise</code>

<a name="mxw.main..balance"></a>

#### main~balance(address) ⇒ <code>Promise</code>
Returns the balance of the given address.

**Kind**: inner method of [<code>main</code>](#mxw.main)  
**Returns**: <code>Promise</code> - balance - Wallet balance  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Address of the wallet |

<a name="mxw.main..transfer"></a>

#### main~transfer(privateKey, address) ⇒ <code>Promise</code>
Transfer tokens from one address to another.

**Kind**: inner method of [<code>main</code>](#mxw.main)  
**Returns**: <code>Promise</code> - tx - Transaction result  
**Params**: <code>number</code> amount - Amount of tokens  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Private key of the wallet from which we're transfering tokens |
| address | <code>string</code> | Address of the wallet to which we're transfering tokens |

<a name="mxw.main..signTransfer"></a>

#### main~signTransfer(privateKey, address) ⇒ <code>Promise</code>
Signs a transfer transaction without relaying it.

**Kind**: inner method of [<code>main</code>](#mxw.main)  
**Returns**: <code>Promise</code> - tx - Transaction signature  
**Params**: <code>number</code> amount - Amount of tokens  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Private key of the wallet from which we're transfering tokens |
| address | <code>string</code> | Address of the wallet to which we're transfering tokens |

<a name="mxw.util"></a>

### mxw.util : <code>object</code>
Utilities

**Kind**: static namespace of [<code>mxw</code>](#mxw)  
**Example**: [`examples/util.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/util.js)

* [.util](#mxw.util) : <code>object</code>
    * [~getAddressByPrivateKey(privateKey)](#mxw.util..getAddressByPrivateKey) ⇒ <code>string</code>
    * [~getAddressByPublicKey(publicKey)](#mxw.util..getAddressByPublicKey) ⇒ <code>string</code>
    * [~generateKeyPair()](#mxw.util..generateKeyPair) ⇒ <code>object</code>
    * [~getAddressFromPublicKeyByteArray(byteArray)](#mxw.util..getAddressFromPublicKeyByteArray) ⇒ <code>string</code>
    * [~decodeTx(encoded)](#mxw.util..decodeTx) ⇒ <code>object</code>
    * [~getSha256(str)](#mxw.util..getSha256) ⇒ <code>string</code>
    * [~getBlock(height)](#mxw.util..getBlock) ⇒ <code>Promise</code>
    * [~getTxsByHeight(height)](#mxw.util..getTxsByHeight) ⇒ <code>Promise</code>
    * [~getTx(hash)](#mxw.util..getTx) ⇒ <code>Promise</code>
    * [~getTxs(address)](#mxw.util..getTxs) ⇒ <code>Promise</code>

<a name="mxw.util..getAddressByPrivateKey"></a>

#### util~getAddressByPrivateKey(privateKey) ⇒ <code>string</code>
Returns wallet address.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>string</code> - address - Wallet address  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Wallet's private key |

<a name="mxw.util..getAddressByPublicKey"></a>

#### util~getAddressByPublicKey(publicKey) ⇒ <code>string</code>
Returns wallet address.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>string</code> - address - Wallet address  

| Param | Type | Description |
| --- | --- | --- |
| publicKey | <code>string</code> | Wallet's public key |

<a name="mxw.util..generateKeyPair"></a>

#### util~generateKeyPair() ⇒ <code>object</code>
Generates a new private/public key pair and a wallet address.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>object</code> - keyPair - Generated keypair  
<a name="mxw.util..getAddressFromPublicKeyByteArray"></a>

#### util~getAddressFromPublicKeyByteArray(byteArray) ⇒ <code>string</code>
Returns wallet address.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>string</code> - address - Wallet address  

| Param | Type | Description |
| --- | --- | --- |
| byteArray | <code>Buffer</code> | Wallet's public key as a byte array |

<a name="mxw.util..decodeTx"></a>

#### util~decodeTx(encoded) ⇒ <code>object</code>
Decodes a tendermint transaction.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>object</code> - tx - Decoded transaction  

| Param | Type | Description |
| --- | --- | --- |
| encoded | <code>string</code> | Base64 encoded transaction |

<a name="mxw.util..getSha256"></a>

#### util~getSha256(str) ⇒ <code>string</code>
Get SHA256 hash of a given string.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>string</code> - hash - Hashed string  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | Arbitrary string |

<a name="mxw.util..getBlock"></a>

#### util~getBlock(height) ⇒ <code>Promise</code>
Get a block at given height.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>Promise</code> - block - Block data  

| Param | Type | Description |
| --- | --- | --- |
| height | <code>number</code> | Block height |

<a name="mxw.util..getTxsByHeight"></a>

#### util~getTxsByHeight(height) ⇒ <code>Promise</code>
Get transactions at given height.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>Promise</code> - txs - Transactions  

| Param | Type | Description |
| --- | --- | --- |
| height | <code>number</code> | Block height |

<a name="mxw.util..getTx"></a>

#### util~getTx(hash) ⇒ <code>Promise</code>
Get a single transaction by hash.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>Promise</code> - tx - Transaction data  

| Param | Type | Description |
| --- | --- | --- |
| hash | <code>string</code> | Transaction hash |

<a name="mxw.util..getTxs"></a>

#### util~getTxs(address) ⇒ <code>Promise</code>
Get transactions by wallet address.

**Kind**: inner method of [<code>util</code>](#mxw.util)  
**Returns**: <code>Promise</code> - txs - Transactions  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Wallet address |

<a name="mxw.alias"></a>

### mxw.alias : <code>object</code>
Aliasing module

**Kind**: static namespace of [<code>mxw</code>](#mxw)  
**Example**: [`examples/alias.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/alias.js)

* [.alias](#mxw.alias) : <code>object</code>
    * [~setAlias(privateKey, alias)](#mxw.alias..setAlias) ⇒ <code>Promise</code>
    * [~removeAlias(privateKey, alias)](#mxw.alias..removeAlias) ⇒ <code>Promise</code>
    * [~getAliasByAddress(address)](#mxw.alias..getAliasByAddress) ⇒ <code>Promise</code>
    * [~getAddressByAlias(alias)](#mxw.alias..getAddressByAlias) ⇒ <code>Promise</code>

<a name="mxw.alias..setAlias"></a>

#### alias~setAlias(privateKey, alias) ⇒ <code>Promise</code>
Set an alias.

**Kind**: inner method of [<code>alias</code>](#mxw.alias)  
**Returns**: <code>Promise</code> - tx - Transaction result  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Wallet's private key |
| alias | <code>string</code> | An alias |

<a name="mxw.alias..removeAlias"></a>

#### alias~removeAlias(privateKey, alias) ⇒ <code>Promise</code>
Remove an alias.

**Kind**: inner method of [<code>alias</code>](#mxw.alias)  
**Returns**: <code>Promise</code> - tx - Transaction result  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Wallet's private key |
| alias | <code>string</code> | An alias |

<a name="mxw.alias..getAliasByAddress"></a>

#### alias~getAliasByAddress(address) ⇒ <code>Promise</code>
Gets alias for a given address

**Kind**: inner method of [<code>alias</code>](#mxw.alias)  
**Returns**: <code>Promise</code> - alias - Alias  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Address of a wallet |

<a name="mxw.alias..getAddressByAlias"></a>

#### alias~getAddressByAlias(alias) ⇒ <code>Promise</code>
Gets the address of an alias

**Kind**: inner method of [<code>alias</code>](#mxw.alias)  
**Returns**: <code>Promise</code> - address - Wallet address  

| Param | Type | Description |
| --- | --- | --- |
| alias | <code>string</code> | An alias |

<a name="mxw.kyc"></a>

### mxw.kyc : <code>object</code>
KYC module

**Kind**: static namespace of [<code>mxw</code>](#mxw)  
**Example**: [`examples/kyc.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/kyc.js)

* [.kyc](#mxw.kyc) : <code>object</code>
    * [~requestWhitelist(privateKey, whitelistAddress)](#mxw.kyc..requestWhitelist) ⇒ <code>Promise</code>
    * [~isWhitelisted(address)](#mxw.kyc..isWhitelisted) ⇒ <code>Promise</code>

<a name="mxw.kyc..requestWhitelist"></a>

#### kyc~requestWhitelist(privateKey, whitelistAddress) ⇒ <code>Promise</code>
Allows users to request whitelisting from the mock KYC service.

**Kind**: inner method of [<code>kyc</code>](#mxw.kyc)  
**Returns**: <code>Promise</code> - tx - Transaction result  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Private key of the KYC provider |
| whitelistAddress | <code>string</code> | Address that we're whitelisting |

<a name="mxw.kyc..isWhitelisted"></a>

#### kyc~isWhitelisted(address) ⇒ <code>Promise</code>
Checks if the wallet address is whitelisted.

**Kind**: inner method of [<code>kyc</code>](#mxw.kyc)  
**Returns**: <code>Promise</code> - whitelist - Boolean  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Address of a wallet |

<a name="mxw.faucet"></a>

### mxw.faucet : <code>object</code>
Faucet module

**Kind**: static namespace of [<code>mxw</code>](#mxw)  
**Example**: [`examples/faucet.js`](https://github.com/maxonrow/mxw-sdk-js/blob/master/examples/faucet.js)

* [.faucet](#mxw.faucet) : <code>object</code>
    * [~getStatus(address)](#mxw.faucet..getStatus) ⇒ <code>Promise</code>
    * [~requestCoins(privateKey, address)](#mxw.faucet..requestCoins) ⇒ <code>Promise</code>

<a name="mxw.faucet..getStatus"></a>

#### faucet~getStatus(address) ⇒ <code>Promise</code>
Allows users to see when they can request new coins from the faucet.

**Kind**: inner method of [<code>faucet</code>](#mxw.faucet)  
**Returns**: <code>Promise</code> - state - Query result  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Address of the wallet |

<a name="mxw.faucet..requestCoins"></a>

#### faucet~requestCoins(privateKey, address) ⇒ <code>Promise</code>
Allows users to request coins from the faucet if they have less than 100 MXW.

**Kind**: inner method of [<code>faucet</code>](#mxw.faucet)  
**Returns**: <code>Promise</code> - tx - Transaction result  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | Private key of the wallet that's requesting tokens |
| address | <code>string</code> | Address of the wallet that's receiving tokens (optional) |

## Notes
- If the SDK loses a connection to one of the blockchain nodes, it'll try to reconnect to a different random node. It'll try to do this **10** times. If the reconnection is not successful, it'll throw an error.
- On MXW testnet, block time is around 5 seconds. This means that it'll take around 5 seconds until you can see commited changes when executing methods that query blockchain state (eg, `API.util.balance`). So, after executing a transaction, you won't see the changes immediatelly. This lag is normal and it's due to Tendermint implementation.