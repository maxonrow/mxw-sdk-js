const EC = require('elliptic').ec

const secp256k1 = new EC('secp256k1')
const bech32 = require('bech32')
const assign = require('lodash.assign')

const { hash, convertSignature } = require('../util.js')

const Cosmos = {}

const getAddress = pubkey => {
    let bytes = hash('ripemd160', hash('sha256', Buffer.from(pubkey, 'hex')))

    return bech32.encode('mxw', bech32.toWords(bytes))
}

/**
 * Returns wallet address.
 * @param {string} privateKey - Wallet's private key
 *
 * @returns {string} address - Wallet address
 */
Cosmos.getAddressByPrivateKey = privateKey => {
    const key = secp256k1.keyFromPrivate(privateKey, 'hex')

    return getAddress(key.getPublic(true, 'hex'))
}

/**
 * Returns wallet address.
 * @param {string} publicKey - Wallet's public key
 *
 * @returns {string} address - Wallet address
 */
Cosmos.getAddressByPublicKey = publicKey => getAddress(publicKey)

/**
 * Returns wallet address.
 * @param {string} byteArray - Wallet's public key as a byte array
 *
 * @returns {string} address - Wallet address
 */
Cosmos.getAddressFromPublicKeyByteArray = byteArray => {
    return getAddress(Buffer.from(byteArray).toString('hex'))
}

/**
 * Generates a new private/public key pair and a wallet address.
 *
 * @returns {object} keyPair - Generated keypair
 */
Cosmos.generateKeyPair = () => {
    const key = secp256k1.genKeyPair()

    return {
        privateKey: key.getPrivate('hex'),
        publicKey: key.getPublic(true, 'hex'),
        address: Cosmos.getAddressByPrivateKey(key.getPrivate('hex')),
    }
}

/**
 * Returns the balance of the given address.
 * @param {object} client - Tendermint client.
 * @param {string} address - Address of the wallet
 *
 * @returns {Promise} balance - Wallet balance
 */
Cosmos.balance = async (client, address) => {
    let hexAddress = Buffer.from(
        bech32.fromWords(bech32.decode(address).words)
    ).toString('hex')

    let state = await client.rawState({
        path: '/store/acc/key',
        data: `01${hexAddress}`,
    })

    let ret = {}

    if (state) {
        state = JSON.parse(state)
        
        if (!state.value.coins) {
            state.value.coins = [{}]
        }

        ret = {
            address: state.value.address,
            balance: state.value.coins[0].amount / 10**8,
            sequence: state.value.sequence,
        }
    } else {
        // if the accounts doesn't exist yet
        ret = {
            address: address,
            balance: 0,
            sequence: 0,
        }
    }

    let alias = await client.rawState({
        path: `/custom/nameservice/whois/${address}`,
    })

    let isWhitelisted = await Cosmos.kyc.isWhitelisted(client, address)

    return assign(ret, {
        alias: alias,
        isApproved: isWhitelisted,
    })
}

const transfer = async (
    client,
    privateKey,
    address,
    amount,
    signOnly = false
) => {
    let hexAddress = Buffer.from(
        bech32.fromWords(
            bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
        )
    ).toString('hex')

    let state = await client.rawState({
        path: '/store/acc/key',
        data: `01${hexAddress}`,
    })

    if (state) {
        state = JSON.parse(state)
    } else {
        state = {
            value: {},
        }
    }

    amount = String(amount * 10**8)

    let payload = {
        account_number: state.value.account_number || '0',
        chain_id: 'mxw',
        fee: {
            amount: [
                {
                    amount: '100000000',
                    denom: 'siu',
                },
            ],
            gas: '200000',
        },
        memo: '',
        msgs: [
            {
                type: 'cosmos-sdk/Send',
                value: {
                    amount: [
                        {
                            amount: amount,
                            denom: 'siu',
                        },
                    ],
                    from_address: Cosmos.getAddressByPrivateKey(privateKey),
                    to_address: address,
                }
            },
        ],
        sequence: state.value.sequence || '0',
    }

    const key = secp256k1.keyFromPrivate(privateKey, 'hex')

    const pubKey = key.getPublic(true, 'hex')

    const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

    let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

    const sigObj = convertSignature(
        secp256k1.sign(jsonHash, privateKey, 'hex', {
            canonical: true,
        })
    )

    const b64Sig = sigObj.toString('base64')

    let tx = {
        type: 'auth/StdTx',
        value: {
            msg: [
                {
                    type: 'cosmos-sdk/Send',
                    value: {
                        amount: [
                            {
                                amount: amount,
                                denom: 'siu',
                            },
                        ],
                        from_address: Cosmos.getAddressByPrivateKey(privateKey),
                        to_address: address,
                    },
                },
            ],
            fee: {
                amount: [
                    {
                        denom: 'siu',
                        amount: '100000000',
                    },
                ],
                gas: '200000',
            },
            signatures: [
                {
                    pub_key: {
                        type: 'tendermint/PubKeySecp256k1',
                        value: b64PubKey,
                    },
                    signature: b64Sig,
                },
            ],
            memo: '',
        },
    }

    if (!signOnly) {
        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    } else {
        return JSON.stringify(tx, null, 4)
    }
}

/**
 * Transfer tokens from one address to another.
 * @param {object} client - Tendermint client.
 * @param {string} privateKey - Private key of the wallet from which we're transfering tokens
 * @param {string} address - Address of the wallet to which we're transfering tokens
 * @params {number} amount - Amount of tokens
 *
 * @returns {Promise} tx - Transaction result
 */
Cosmos.transfer = async (client, privateKey, address, amount) => {
    return await transfer(client, privateKey, address, amount, false)
}

/**
 * Signs a transfer transaction without relaying it.
 * @param {object} client - Tendermint client.
 * @param {string} privateKey - Private key of the wallet from which we're transfering tokens
 * @param {string} address - Address of the wallet to which we're transfering tokens
 * @params {number} amount - Amount of tokens
 *
 * @returns {Promise} tx - Transaction signature
 */
Cosmos.signTransfer = async (client, privateKey, address, amount) => {
    return await transfer(client, privateKey, address, amount, true)
}

/**
 * Decodes a tendermint transaction.
 * @param {object} client - Tendermint client
 * @param {string} encoded - Base64 encoded transaction
 *
 * @returns {object} tx - Decoded transaction
 */
Cosmos.decodeTransaction = (client, encoded) => {
    return JSON.parse(Buffer.from(encoded, 'base64').toString())
}

Cosmos.kyc = {
    /**
     * Allows users to request whitelisting from the mock KYC service..
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the KYC provider
     * @param {string} whitelistAddress - Address that we're whitelisting
     *
     * @returns {Promise} tx - Transaction result
     */
    requestWhitelist: async (client, privateKey, whitelistAddress) => {
        const address = Cosmos.getAddressByPrivateKey(privateKey)

        let hexAddress = Buffer.from(
            bech32.fromWords(bech32.decode(address).words)
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [{ owner: address, target: whitelistAddress }],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash(
            'sha256',
            Buffer.from(JSON.stringify(payload), 'utf8')
        )

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'kyc/Whitelist',
                        value: { owner: address, target: whitelistAddress },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Checks if the wallet address is whitelisted.
     * @param {object} client - Tendermint client.
     * @param {string} address - Address of a wallet
     *
     * @returns {Promise} whitelist - Boolean
     */
    isWhitelisted: async (client, address) => {
        return (
            (await client.rawState({
                path: `/custom/kyc/is_whitelisted/${address}`,
            })) === 'True'
        )
    },
}

Cosmos.alias = {
    /**
     * Gets the address of an alias
     * @param {object} client - Tendermint client.
     * @param {string} alias - An alias
     *
     * @returns {Promise} address - Wallet address
     */
    getAddress: async (client, alias) => {
        const state = await client.rawState(
            {
                path: `/custom/nameservice/resolve/${alias}`,
            },
            false
        )

        if (state && state.toString()) {
            return bech32.encode('mxw', bech32.toWords(state))
        }

        return alias
    },
    /**
     * Gets alias for a given address
     * @param {object} client - Tendermint client.
     * @param {string} address - Address of a wallet
     *
     * @returns {Promise} alias - Alias
     */
    getAlias: async (client, address) => {
        return await client.rawState({
            path: `/custom/nameservice/whois/${address}`,
        })
    },
    /**
     * Set an alias.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Wallet's private key
     * @param {string} alias - An alias
     *
     * @returns {Promise} tx - Transaction result
     */
    setAlias: async (client, privateKey, alias) => {
        const address = Cosmos.getAddressByPrivateKey(privateKey)

        let hexAddress = Buffer.from(
            bech32.fromWords(bech32.decode(address).words)
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    alias: alias,
                    owner: address,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash(
            'sha256',
            Buffer.from(JSON.stringify(payload), 'utf8')
        )

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'nameservice/SetAlias',
                        value: {
                            alias: alias,
                            owner: address,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Remove an alias.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Wallet's private key
     * @param {string} alias - An alias
     *
     * @returns {Promise} tx - Transaction result
     */
    removeAlias: (client, privateKey, alias) => {
        throw Error('Not implemented.')
    },
}

Cosmos.faucet = {
    /**
     * Allows users to see when they can request new coins from the faucet.
     * @param {object} client - Tendermint client.
     * @param {string} address - Address of the wallet
     *
     * @returns {Promise} state - Query result
     */
    getStatus: async (client, address) => {
        const state = await client.rawState(
            {
                path: `/custom/mint/mint_self_status/${address}`,
            },
            true
        )

        return JSON.parse(state || {})
    },
    /**
     * Allows users to request coins from the faucet if they have less than 100 MXW.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the wallet that's requesting tokens
     * @param {string} address - Address of the wallet that's receiving tokens
     *
     * @returns {Promise} tx - Transaction result
     */
    requestCoins: async (client, privateKey, address) => {
        address = Cosmos.getAddressByPrivateKey(privateKey)

        let hexAddress = Buffer.from(
            bech32.fromWords(bech32.decode(address).words)
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    amount: 1000000000,
                    requester: address,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash(
            'sha256',
            Buffer.from(JSON.stringify(payload), 'utf8')
        )

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'mint/mint',
                        value: {
                            requester: address,
                            amount: '1000000000',
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
}

Cosmos.asset = {
    /**
     * Allows users to create a new fungible asset class.
     * @param {object} client - Tendermint client.
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
    createFungibleAssetClass: async (client, privateKey, classId, dynamicSupply, initialSupply, totalSupply, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    asset_class_id: classId,
                    data_link: dataLink,
                    dynamic_supply: dynamicSupply,
                    initial_supply: initialSupply,
                    issuer: Cosmos.getAddressByPrivateKey(privateKey),
                    total_supply: totalSupply

                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/createFungibleAssetClass',
                        value: {
                            issuer: Cosmos.getAddressByPrivateKey(privateKey),
                            asset_class_id: classId,
                            dynamic_supply: dynamicSupply,
                            initial_supply: String(initialSupply),
                            total_supply: String(totalSupply),
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to approve a fungible asset class.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the wallet that's approving the asset class
     * @param {string} classId - Id of the asset class
     * @param {string} dataLink - Data link
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} tx - Transaction result
     */
    approveAssetClass: async (client, privateKey, classId, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    approver: Cosmos.getAddressByPrivateKey(privateKey),
                    asset_class_id: classId,
                    data_link: dataLink,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/approveAssetClass',
                        value: {
                            approver: Cosmos.getAddressByPrivateKey(privateKey),
                            asset_class_id: classId,
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to reject a fungible asset class.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the wallet that's rejecting the asset class
     * @param {string} classId - Id of the asset class
     * @param {string} dataLink - Data link
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} tx - Transaction result
     */
    rejectAssetClass: async (client, privateKey, classId, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    approver: Cosmos.getAddressByPrivateKey(privateKey),
                    asset_class_id: classId,
                    data_link: dataLink,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/rejectAssetClass',
                        value: {
                            approver: Cosmos.getAddressByPrivateKey(privateKey),
                            asset_class_id: classId,
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to freeze a fungible asset class.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the wallet that's freezing the asset class
     * @param {string} classId - Id of the asset class
     * @param {string} dataLink - Data link
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} tx - Transaction result
     */
    freezeAssetClass: async (client, privateKey, classId, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    approver: Cosmos.getAddressByPrivateKey(privateKey),
                    asset_class_id: classId,
                    data_link: dataLink,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/freezeAssetClass',
                        value: {
                            approver: Cosmos.getAddressByPrivateKey(privateKey),
                            asset_class_id: classId,
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to unfreeze a fungible asset class.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the wallet that's unfreezing the asset class
     * @param {string} classId - Id of the asset class
     * @param {string} dataLink - Data link
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} tx - Transaction result
     */
    unfreezeAssetClass: async (client, privateKey, classId, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    approver: Cosmos.getAddressByPrivateKey(privateKey),
                    asset_class_id: classId,
                    data_link: dataLink,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/unfreezeAssetClass',
                        value: {
                            approver: Cosmos.getAddressByPrivateKey(privateKey),
                            asset_class_id: classId,
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to issue a fungible asset.
     * @param {object} client - Tendermint client.
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
    issueFungibleAsset: async (client, privateKey, classId, owner, count) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    asset_class_id: classId,
                    count: count,
                    issuer: Cosmos.getAddressByPrivateKey(privateKey),
                    owner: owner,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/issueFungibleAsset',
                        value: {
                            issuer: Cosmos.getAddressByPrivateKey(privateKey),
                            asset_class_id: classId,
                            owner: owner,
                            count: String(count),
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to transfer fungible assets.
     * @param {object} client - Tendermint client.
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
    transferFungibleAsset: async (client, privateKey, classId, count, newOwner) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    asset_class_id: classId,
                    count: count,
                    new_owner: newOwner,
                    owner: Cosmos.getAddressByPrivateKey(privateKey),
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/transferFungibleAsset',
                        value: {
                            asset_class_id: classId,
                            count: String(count),
                            owner: Cosmos.getAddressByPrivateKey(privateKey),
                            new_owner: newOwner,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to burn fungible assets.
     * @param {object} client - Tendermint client.
     * @param {string} privateKey - Private key of the wallet that's burning the asset
     * @param {string} classId - Id of the asset class
     * @param {number} count - Number of assets
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} tx - Transaction result
     */
    burnFungibleAsset: async (client, privateKey, classId, count) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    asset_class_id: classId,
                    count: count,
                    owner: Cosmos.getAddressByPrivateKey(privateKey),
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/burnFungibleAsset',
                        value: {
                            asset_class_id: classId,
                            count: String(count),
                            owner: Cosmos.getAddressByPrivateKey(privateKey),
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to freeze a fungible asset account
     * @param {object} client - Tendermint client.
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
    freezeFungibleAssetAccount: async (client, privateKey, classId, owner, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    approver: Cosmos.getAddressByPrivateKey(privateKey),
                    asset_class_id: classId,
                    data_link: dataLink,
                    owner: owner,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/freezeFungibleAsset',
                        value: {
                            asset_class_id: classId,
                            owner: owner,
                            approver: Cosmos.getAddressByPrivateKey(privateKey),
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to unfreeze a fungible asset account
     * @param {object} client - Tendermint client.
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
    unfreezeFungibleAssetAccount: async (client, privateKey, classId, owner, dataLink) => {
        let hexAddress = Buffer.from(
            bech32.fromWords(
                bech32.decode(Cosmos.getAddressByPrivateKey(privateKey)).words
            )
        ).toString('hex')

        let state = await client.rawState({
            path: '/store/acc/key',
            data: `01${hexAddress}`,
        })

        if (state) {
            state = JSON.parse(state)
        } else {
            state = {
                value: {},
            }
        }

        let payload = {
            account_number: state.value.account_number || '0',
            chain_id: 'mxw',
            fee: {
                amount: [
                    {
                        amount: '0',
                        denom: '',
                    },
                ],
                gas: '200000',
            },
            memo: '',
            msgs: [
                {
                    approver: Cosmos.getAddressByPrivateKey(privateKey),
                    asset_class_id: classId,
                    data_link: dataLink,
                    owner: owner,
                },
            ],
            sequence: state.value.sequence || '0',
        }

        const key = secp256k1.keyFromPrivate(privateKey, 'hex')

        const pubKey = key.getPublic(true, 'hex')

        const b64PubKey = Buffer.from(pubKey, 'hex').toString('base64')

        let jsonHash = hash('sha256', Buffer.from(JSON.stringify(payload), 'utf8'))

        const sigObj = convertSignature(
            secp256k1.sign(jsonHash, privateKey, 'hex', {
                canonical: true,
            })
        )

        const b64Sig = sigObj.toString('base64')

        let tx = {
            type: 'auth/StdTx',
            value: {
                msg: [
                    {
                        type: 'asset/unfreezeFungibleAsset',
                        value: {
                            asset_class_id: classId,
                            owner: owner,
                            approver: Cosmos.getAddressByPrivateKey(privateKey),
                            data_link: dataLink,
                        },
                    },
                ],
                fee: {
                    amount: [
                        {
                            denom: '',
                            amount: '0',
                        },
                    ],
                    gas: '200000',
                },
                signatures: [
                    {
                        pub_key: {
                            type: 'tendermint/PubKeySecp256k1',
                            value: b64PubKey,
                        },
                        signature: b64Sig,
                    },
                ],
                memo: '',
            },
        }

        return client.send(
            Buffer.from(JSON.stringify(tx), 'utf8').toString('hex'),
            false
        )
    },
    /**
     * Allows users to list all available asset classes
     * @param {object} client - Tendermint client.
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} data - All asset classes
     */
    listClasses: async (client) => {
        const state = await client.rawState(
            {
                path: `/custom/asset/list-asset-classes`,
            },
            true
        )

        return JSON.parse(state || {})
    },
    /**
     * Allows users to query an asset class by class id
     * @param {object} client - Tendermint client.
     * @param {string} classId - Id of the asset class
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} data - Asset class
     */
    queryClass: async (client, classId) => {
        const state = await client.rawState(
            {
                path: `/custom/asset/asset-class/${classId}`,
            },
            true
        )

        return JSON.parse(state || {})
    },
    /**
     * Allows users to query an account with assets
     * @param {object} client - Tendermint client.
     * @param {string} classId - Id of the asset class
     * @param {string} address - Account address
     *
     * @memberof mxw.asset
     * @inner
     *
     * @returns {Promise} data - Account
     */
    queryAccount: async (client, classId, address) => {
        const state = await client.rawState(
            {
                path: `/custom/asset/account/${classId}/${address}`,
            },
            true
        )

        return JSON.parse(state || {})
   },
}

module.exports = Cosmos
