const { RpcClient } = require('tendermint')
const { hash } = require('./util.js')
const axios = require('axios')

const client = require('./client.js')

const Cosmos = require('./backend/cosmos.js')

/**
 * MXW SDK module
 * @version 0.1.1
 * @exports MxwApi
 * @namespace mxw
 */
const MxwApi = function(opts) {
    let handlers = {}

    let backend

    /**
     * Set the backend.
     * @param {string} be - Name of the backend ('cosmos')
     *
     * @memberof mxw
     */
    this.setBackend = be => {
        backend = Cosmos
    }

    this.setBackend(opts.backend)

    let nodes = opts.nodes
    let indexer = opts.indexer

    if (!nodes || !nodes.length) {
        throw Error('Invalid nodes array.')
    }

    this.client = client({
        nodes: nodes,
    })

    this.retryCounter = 0
    this.isReconnnecting = false

    this.connectRpc = () => {
        this.rpcClient = RpcClient(nodes[Math.floor(Math.random() * nodes.length)])

        this.rpcClient.removeAllListeners()

        this.rpcClient.subscribe(["tm.event='NewBlock'"], data => {
            if (handlers['block'] && typeof handlers['block'] === 'function') {
                handlers['block'](data)
            }

            this.retryCounter = 0
        })
    
        this.rpcClient.subscribe(["tm.event='Tx'"], data => {
            if (handlers['tx'] && typeof handlers['tx'] === 'function') {
                handlers['tx'](data)
            }

            this.retryCounter = 0
        })

        this.rpcClient.on('error', error => {
            if (this.isReconnnecting) {
                return
            }

            this.isReconnnecting = true

            setTimeout(() => {
                if (this.retryCounter++ < 10) {
                    console.log(`[SDK] Reconnecting ${this.retryCounter}. time.`)

                    this.connectRpc()

                    this.isReconnnecting = false
                    
                } else
                    throw new Error('Reconnecting failed.')

            }, this.retryCounter * 1000)
        })

    }

    this.connectRpc()

    /**
     * Events
     * @namespace mxw.events
     * @type {object}
     * @memberof mxw
     */
    this.events = {
        /**
         * Set the new transaction handler.
         * @param {function} fnc - Function that will be called on every new transaction (format: (data) => {})
         *
         * @memberof mxw.events
         * @inner
         */
        onTx: fnc => {
            if (fnc && typeof fnc === 'function') {
                handlers['tx'] = fnc
            } else {
                throw Error('Invalid function.')
            }
        },
        /**
         * Set the new block handler.
         * @param {function} fnc - Function that will be called on every new block (format: (data) => {})
         *
         * @memberof mxw.events
         * @inner
         */
        onBlock: fnc => {
            if (fnc && typeof fnc === 'function') {
                handlers['block'] = fnc
            } else {
                throw Error('Invalid function.')
            }
        },
        /**
         * Removes a certain handler
         * @param {string} type - Handler type ('tx'|'block')
         *
         * @memberof mxw.events
         * @inner
         */
        removeHandler: type => {
            delete handlers[type]
        },
    }

    /**
     * Main
     * @namespace mxw.main
     * @type {object}
     * @memberof mxw
     */
    this.main = {
        /**
         * Returns the balance of the given address.
         * @param {string} address - Address of the wallet
         *
         * @memberof mxw.main
         * @inner
         *
         * @returns {Promise} balance - Wallet balance
         */
        balance: async address => {
            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            const client = await this.client

            address = await backend.alias.getAddress(client, address)

            return await backend.balance(client, address)
        },
        /**
         * Transfer tokens from one address to another.
         * @param {string} privateKey - Private key of the wallet from which we're transfering tokens
         * @param {string} address - Address of the wallet to which we're transfering tokens
         * @params {number} amount - Amount of tokens
         *
         * @memberof mxw.main
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        transfer: async (privateKey, address, amount) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            if (!amount) {
                throw Error('Invalid amount.')
            }

            const client = await this.client

            address = await backend.alias.getAddress(client, address)

            amount = Number(amount)

            return await backend.transfer(client, privateKey, address, amount)
        },
        /**
         * Signs a transfer transaction without relaying it.
         * @param {string} privateKey - Private key of the wallet from which we're transfering tokens
         * @param {string} address - Address of the wallet to which we're transfering tokens
         * @params {number} amount - Amount of tokens
         *
         * @memberof mxw.main
         * @inner
         *
         * @returns {Promise} tx - Transaction signature
         */
        signTransfer: async (privateKey, address, amount) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            if (!amount) {
                throw Error('Invalid amount.')
            }

            const client = await this.client

            address = await backend.alias.getAddress(client, address)

            amount = Number(amount)

            return await backend.signTransfer(
                client,
                privateKey,
                address,
                amount
            )
        },
    }

    /**
     * Utilities
     * @namespace mxw.util
     * @type {object}
     * @memberof mxw
     */
    this.util = {
        /**
         * Returns wallet address.
         * @param {string} privateKey - Wallet's private key
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {string} address - Wallet address
         */
        getAddressByPrivateKey: privateKey => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            return backend.getAddressByPrivateKey(privateKey)
        },
        /**
         * Returns wallet address.
         * @param {string} publicKey - Wallet's public key
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {string} address - Wallet address
         */
        getAddressByPublicKey: publicKey => {
            if (!publicKey || typeof publicKey !== 'string') {
                throw Error('Invalid public key.')
            }

            return backend.getAddressByPublicKey(publicKey)
        },
        /**
         * Generates a new private/public key pair and a wallet address.
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {object} keyPair - Generated keypair
         */
        generateKeyPair: () => {
            return backend.generateKeyPair()
        },
        /**
         * Returns wallet address.
         * @param {Buffer} byteArray - Wallet's public key as a byte array
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {string} address - Wallet address
         */
        getAddressFromPublicKeyByteArray: byteArray => {
            if (!byteArray) {
                throw Error('Invalid byte array.')
            }

            return backend.getAddressFromPublicKeyByteArray(byteArray)
        },
        /**
         * Decodes a tendermint transaction.
         * @param {string} encoded - Base64 encoded transaction
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {object} tx - Decoded transaction
         */
        decodeTx: encoded => {
            if (!encoded || typeof encoded !== 'string') {
                throw Error('Invalid encoded transaction.')
            }

            return backend.decodeTransaction(client, encoded)
        },
        /**
         * Get SHA256 hash of a given string.
         * @param {string} str - Arbitrary string
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {string} hash - Hashed string
         */
        getSha256: str => hash('sha256', str).toString('hex'),
        /**
         * Get a block at given height.
         * @param {number} height - Block height
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {Promise} block - Block data
         */
        getBlock: async height => {
            if (!height || typeof height !== 'number') {
                throw Error('Invalid height.')
            }

            return (await axios.get(
                `${nodes[Math.floor(Math.random() * nodes.length)].replace(
                    'ws',
                    'http'
                )}/block?height=${height}`
            )).data
        },
        /**
         * Get transactions at given height.
         * @param {number} height - Block height
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {Promise} txs - Transactions
         */
        getTxsByHeight: async height => {
            if (!height || typeof height !== 'number') {
                throw Error('Invalid height.')
            }

            return (await axios.get(
                `${nodes[Math.floor(Math.random() * nodes.length)].replace(
                    'ws',
                    'http'
                )}/tx_search?query="tx.height=${height}"&prove=false`
            )).data
        },
        /**
         * Get a single transaction by hash.
         * @param {string} hash - Transaction hash
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {Promise} tx - Transaction data
         */
        getTx: async hash => {
            if (!hash || typeof hash !== 'string') {
                throw Error('Invalid transaction hash.')
            }

            return (await axios.get(`${indexer}/tx/${hash}`)).data
        },
        /**
         * Get transactions by wallet address.
         * @param {string} address - Wallet address
         *
         * @memberof mxw.util
         * @inner
         *
         * @returns {Promise} txs - Transactions
         */
        getTxs: async address => {
            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            return (await axios.get(`${indexer}/txs/${address}`)).data
        },
    }

    /**
     * Aliasing module
     * @namespace mxw.alias
     * @type {object}
     * @memberof mxw
     */
    this.alias = {
        /**
         * Set an alias.
         * @param {string} privateKey - Wallet's private key
         * @param {string} alias - An alias
         *
         * @memberof mxw.alias
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        setAlias: async (privateKey, alias) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!alias || typeof alias !== 'string') {
                throw Error('Invalid alias.')
            }

            const client = await this.client

            return await backend.alias.setAlias(client, privateKey, alias)
        },
        /**
         * Remove an alias.
         * @param {string} privateKey - Wallet's private key
         * @param {string} alias - An alias
         *
         * @memberof mxw.alias
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        removeAlias: async (privateKey, alias) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!alias || typeof alias !== 'string') {
                throw Error('Invalid alias.')
            }

            const client = await this.client

            return await backend.alias.removeAlias(client, privateKey, alias)
        },
        /**
         * Gets alias for a given address
         * @param {string} address - Address of a wallet
         *
         * @memberof mxw.alias
         * @inner
         *
         * @returns {Promise} alias - Alias
         */
        getAliasByAddress: async address => {
            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            const client = await this.client

            return await backend.alias.getAlias(client, address)
        },
        /**
         * Gets the address of an alias
         * @param {string} alias - An alias
         *
         * @memberof mxw.alias
         * @inner
         *
         * @returns {Promise} address - Wallet address
         */
        getAddressByAlias: async alias => {
            if (!alias || typeof alias !== 'string') {
                throw Error('Invalid alias.')
            }

            const client = await this.client

            return await backend.alias.getAddress(client, alias)
        },
    }

    /**
     * KYC module
     * @namespace mxw.kyc
     * @type {object}
     * @memberof mxw
     */
    this.kyc = {
        /**
         * Allows users to request whitelisting from the mock KYC service.
         * @param {string} privateKey - Private key of the KYC provider
         * @param {string} whitelistAddress - Address that we're whitelisting
         *
         * @memberof mxw.kyc
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        requestWhitelist: async (privateKey, whitelistAddress) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!whitelistAddress || typeof whitelistAddress !== 'string') {
                throw Error('Invalid whitelist address.')
            }

            const client = await this.client

            return await backend.kyc.requestWhitelist(
                client,
                privateKey,
                whitelistAddress
            )
        },
        /**
         * Checks if the wallet address is whitelisted.
         * @param {string} address - Address of a wallet
         *
         * @memberof mxw.kyc
         * @inner
         *
         * @returns {Promise} whitelist - Boolean
         */
        isWhitelisted: async address => {
            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            const client = await this.client

            return await backend.kyc.isWhitelisted(client, address)
        },
    }

    /**
     * Faucet module
     * @namespace mxw.faucet
     * @type {object}
     * @memberof mxw
     */
    this.faucet = {
        /**
         * Allows users to see when they can request new coins from the faucet.
         * @param {string} address - Address of the wallet
         *
         * @memberof mxw.faucet
         * @inner
         *
         * @returns {Promise} state - Query result
         */
        getStatus: async (address) => {
            if (!address || typeof address !== 'string') {
                throw Error('Invalid address.')
            }

            const client = await this.client

            return await backend.faucet.getStatus(
                client,
                address
            )
        },
        /**
         * Allows users to request coins from the faucet if they have less than 100 MXW.
         * @param {string} privateKey - Private key of the wallet that's requesting tokens
         * @param {string} address - Address of the wallet that's receiving tokens (optional)
         *
         * @memberof mxw.faucet
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        requestCoins: async (privateKey, address) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            const client = await this.client

            return await backend.faucet.requestCoins(
                client,
                privateKey,
                address
            )
        },
    }

    /**
     * Asset module
     * @namespace mxw.asset
     * @type {object}
     * @memberof mxw
     */
    this.asset = {
        /**
         * Allows users to create a new fungible asset class.
         * @param {string} privateKey - Private key of the wallet that's creating the new fungible asset class
         * @param {string} classId - Id of the new asset class
         * @param {bool} dynamicSupply - A flag that determines if there will be a dynamic supply
         * @param {number} initialSupply - Initial supply of the new asset class
         * @param {number} totalSupply - Total supply of the new asset class
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        createFungibleAssetClass: async (privateKey, classId, dynamicSupply, initialSupply, totalSupply, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (typeof dynamicSupply !== 'boolean') {
                throw Error('Invalid dynamic supply parameter.')
            }

            if (typeof initialSupply !== 'number') {
                throw Error('Invalid initial supply.')
            }

            if (typeof totalSupply !== 'number') {
                throw Error('Invalid total supply.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            return await backend.asset.createFungibleAssetClass(
                client,
                privateKey,
                classId,
                dynamicSupply,
                initialSupply,
                totalSupply,
                dataLink
            )
        },
        /**
         * Allows users to approve a fungible asset class.
         * @param {string} privateKey - Private key of the wallet that's approving the asset class
         * @param {string} classId - Id of the asset class
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        approveAssetClass: async (privateKey, classId, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            return await backend.asset.approveAssetClass(
                client,
                privateKey,
                classId,
                dataLink
            )
        },
        /**
         * Allows users to reject a fungible asset class.
         * @param {string} privateKey - Private key of the wallet that's rejecting the asset class
         * @param {string} classId - Id of the asset class
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        rejectAssetClass: async (privateKey, classId, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            return await backend.asset.rejectAssetClass(
                client,
                privateKey,
                classId,
                dataLink
            )
        },
        /**
         * Allows users to freeze a fungible asset class.
         * @param {string} privateKey - Private key of the wallet that's freezing the asset class
         * @param {string} classId - Id of the asset class
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        freezeAssetClass: async (privateKey, classId, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            return await backend.asset.freezeAssetClass(
                client,
                privateKey,
                classId,
                dataLink
            )
        },
        /**
         * Allows users to unfreeze a fungible asset class.
         * @param {string} privateKey - Private key of the wallet that's unfreezing the asset class
         * @param {string} classId - Id of the asset class
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        unfreezeAssetClass: async (privateKey, classId, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            return await backend.asset.unfreezeAssetClass(
                client,
                privateKey,
                classId,
                dataLink
            )
        },
        /**
         * Allows users to issue a fungible asset.
         * @param {string} privateKey - Private key of the wallet that's issuing the asset
         * @param {string} classId - Id of the asset class
         * @param {string} owner - Owner of the issued asset
         * @param {number} count - Number of assets
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        issueFungibleAsset: async (privateKey, classId, owner, count) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!owner || typeof owner !== 'string') {
                throw Error('Invalid owner.')
            }

            if (typeof count !== 'number') {
                throw Error('Invalid sequence.')
            }

            const client = await this.client

            owner = await backend.alias.getAddress(client, owner)

            return await backend.asset.issueFungibleAsset(
                client,
                privateKey,
                classId,
                owner,
                count
            )
        },
        /**
         * Allows users to transfer fungible assets.
         * @param {string} privateKey - Private key of the wallet that's transferring the asset
         * @param {string} classId - Id of the asset class
         * @param {number} count - Number of assets
         * @param {string} newOwner - New owner of the issued asset
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        transferFungibleAsset: async (privateKey, classId, count, newOwner) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (typeof count !== 'number') {
                throw Error('Invalid count.')
            }

            if (!newOwner || typeof newOwner !== 'string') {
                throw Error('Invalid new owner.')
            }

            const client = await this.client

            newOwner = await backend.alias.getAddress(client, newOwner)

            return await backend.asset.transferFungibleAsset(
                client,
                privateKey,
                classId,
                count,
                newOwner
            )
        },
        /**
         * Allows users to burn fungible assets.
         * @param {string} privateKey - Private key of the wallet that's burning the asset
         * @param {string} classId - Id of the asset class
         * @param {number} count - Number of assets
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        burnFungibleAsset: async (privateKey, classId, count) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (typeof count !== 'number') {
                throw Error('Invalid count.')
            }

            const client = await this.client

            return await backend.asset.burnFungibleAsset(
                client,
                privateKey,
                classId,
                count
            )
        },
        /**
         * Allows users to freeze a fungible asset account
         * @param {string} privateKey - Private key of the wallet that's freezing the asset account
         * @param {string} classId - Id of the asset class
         * @param {string} owner - Owner of the asset account
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        freezeFungibleAssetAccount: async (privateKey, classId, owner, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!owner || typeof owner !== 'string') {
                throw Error('Invalid owner.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            owner = await backend.alias.getAddress(client, owner)

            return await backend.asset.freezeFungibleAssetAccount(
                client,
                privateKey,
                classId,
                owner,
                dataLink
            )
        },
        /**
         * Allows users to unfreeze a fungible asset account
         * @param {string} privateKey - Private key of the wallet that's unfreezing the asset account
         * @param {string} classId - Id of the asset class
         * @param {string} owner - Owner of the asset account
         * @param {string} dataLink - Data link
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} tx - Transaction result
         */
        unfreezeFungibleAssetAccount: async (privateKey, classId, owner, dataLink) => {
            if (!privateKey || typeof privateKey !== 'string') {
                throw Error('Invalid private key.')
            }

            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!owner || typeof owner !== 'string') {
                throw Error('Invalid owner.')
            }

            if (!dataLink || typeof dataLink !== 'string') {
                throw Error('Invalid data link.')
            }

            const client = await this.client

            owner = await backend.alias.getAddress(client, owner)

            return await backend.asset.unfreezeFungibleAssetAccount(
                client,
                privateKey,
                classId,
                owner,
                dataLink
            )
        },
        /**
         * Allows users to list all available asset classes
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} data - All asset classes
         */
        listClasses: async () => {
            const client = await this.client

            return await backend.asset.listClasses(
                client
            )
        },
        /**
         * Allows users to query an asset class by class id
         * @param {string} classId - Id of the asset class
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} data - Asset class
         */
        queryClass: async (classId) => {
            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            const client = await this.client

            return await backend.asset.queryClass(
                client,
                classId
            )
        },
        /**
         * Allows users to query an account with assets
         * @param {string} classId - Id of the asset class
         * @param {string} address - Account address
         *
         * @memberof mxw.asset
         * @inner
         *
         * @returns {Promise} data - Account
         */
        queryAccount: async (classId, address) => {
            if (!classId || typeof classId !== 'string') {
                throw Error('Invalid asset class id.')
            }

            if (!address || typeof address !== 'string') {
                throw Error('Invalid account address.')
            }

            const client = await this.client

            return await backend.asset.queryAccount(
                client,
                classId,
                address
            )
        },
    }
}

module.exports = MxwApi
