// Load the SDK
const MxwApi = require('mxw-sdk-js')

// Define all nodes from which SDK can choose one
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
const INDEXER = 'http://services.testnet.space:1234'

// Instantiate the SDK
const API = new MxwApi({
    nodes: NODES,
    indexer: INDEXER,
    backend: 'cosmos',
})

// Generate a new keypair
let kp = API.util.generateKeyPair()
console.log(kp.privateKey)
console.log(kp.publicKey)
console.log(kp.address)

// Get address from a public key
let address = API.util.getAddressByPublicKey(kp.publicKey)
console.log(address)

// Get address from a private key
let address2 = API.util.getAddressByPrivateKey(kp.privateKey)
console.log(address2)

// Get address from public key byte array
let address3 = API.util.getAddressFromPublicKeyByteArray(Buffer.from(kp.publicKey, 'hex'))
console.log(address3);

// Get a block from chain
(async () => {
    let block = await API.util.getBlock(1)

    console.log(block.result.block)
})()