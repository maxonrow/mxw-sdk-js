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
    // KYC must be completed berfore you can mint tokens from the faucet
    let tx = await API.kyc.requestWhitelist('fdd7070786db74ac60b03a936def63e4042bb79088950e52f865f42d53874234', kp.address)

    console.log(tx)

    await delay(7000) // wait for changes to commit

    // request coins from the faucet
    tx = await API.faucet.requestCoins(kp.privateKey, kp.address)

    console.log(tx)

    await delay(7000) // wait for changes to commit

    // check when you can request coins again
    let res = await API.faucet.getStatus(kp.address)

    console.log(res)

    // fetch the account object, including the balance
    let status = await API.main.balance(kp.address)

    console.log(status)
})()
