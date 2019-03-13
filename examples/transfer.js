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

const delay = (ms = 1000) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}

// Generate a random alias
let kp = API.util.generateKeyPair();

(async () => {
    // KYC must be completed berfore you can transfer tokens
    let tx = await API.kyc.requestWhitelist('fdd7070786db74ac60b03a936def63e4042bb79088950e52f865f42d53874234', kp.address)

    console.log(tx)

    await delay(7000) // wait for changes to commit

    // generate a new wallet where to transfer funds
    let newKp = API.util.generateKeyPair()

    console.log(newKp)

    // transfer 5mxw from kp to newKp
    tx = await API.main.transfer(kp.privateKey, newKp.address, 5)

    console.log(tx)

    await delay(7000)

    // check the balance of newKp
    let status = await API.main.balance(newKp.address)

    console.log(status)

    // check balance of kp
    let status2 = await API.main.balance(kp.address)

    console.log(status2)
})()
