'use strict';

import { defineReadOnly, resolveProperties, checkProperties } from './utils/properties';
import { sortObject, checkFormat, arrayOf, checkAddress, checkString, checkNumber, checkBigNumber, checkBoolean, allowNullOrEmpty, allowNull, iterate, isUndefinedOrNull } from './utils/misc';
import { encode as base64Encode } from './utils/base64';

import * as errors from './errors';

// Imported Abstracts
import { Provider } from './providers/abstract-provider';
import { Signer } from './abstract-signer';

///////////////////////////////
// Imported Types

import {
    TransactionReceipt, TransactionRequest, TransactionResponse, BlockTag,
    TokenState
} from './providers/abstract-provider';
import { BigNumberish, BigNumber, bigNumberify } from './utils';

const formatFungibleToken = {
    name: checkString,
    symbol: checkString,
    decimals: checkNumber,
    fixedSupply: checkBoolean,
    totalSupply: checkBigNumber,
    owner: allowNull(checkAddress),
    metadata: allowNullOrEmpty(checkString),
    fee: {
        to: checkAddress,
        value: checkBigNumber
    }
}

export interface FungibleTokenProperties {
    name: string,
    symbol: string,
    decimals: number,
    fixedSupply: boolean,
    totalSupply: BigNumber,
    fee: {
        to: string,
        value: BigNumber
    }
    metadata?: string,
    owner?: string,
}

export interface FungibleTokenStatus {
    token: {
        from: string,
        nonce: BigNumber,
        status: string,
        symbol: string,
        transferFee: BigNumber,
        burnable: boolean
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export interface FungibleTokenStatusTransaction {
    payload: FungibleTokenStatus,
    signatures: TokenSignature[]
}

export interface FungibleTokenAccountStatus {
    tokenAccount: {
        from: string,
        to: string,
        nonce: BigNumber,
        status: string,
        symbol: string
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

function checkFungibleTokenStatus(data: any): FungibleTokenStatusTransaction {
    return checkFormat({
        payload: function (value: any): FungibleTokenStatus {
            return checkFormat({
                token: {
                    from: checkAddress,
                    nonce: checkBigNumber,
                    status: checkString,
                    symbol: checkString,
                    transferFee: checkBigNumber,
                    burnable: checkBoolean
                },
                pub_key: {
                    type: checkString,
                    value: checkString
                },
                signature: checkString
            }, value);
        },
        signatures: arrayOf(function (value: any): TokenSignature {
            return checkFormat({
                pub_key: {
                    type: checkString,
                    value: checkString
                },
                signature: checkString
            }, value);
        })
    }, data);
}

export interface FungibleTokenAccountStatusTransaction {
    payload: FungibleTokenAccountStatus,
    signatures: TokenSignature[]
}

function checkFungibleTokenAccountStatus(data: any): FungibleTokenAccountStatusTransaction {
    return checkFormat({
        payload: function (value: any): FungibleTokenAccountStatus {
            return checkFormat({
                tokenAccount: {
                    from: checkAddress,
                    to: checkAddress,
                    nonce: checkBigNumber,
                    status: checkString,
                    symbol: checkString
                },
                pub_key: {
                    type: checkString,
                    value: checkString
                },
                signature: checkString
            }, value);
        },
        signatures: arrayOf(function (value: any): TokenSignature {
            return checkFormat({
                pub_key: {
                    type: checkString,
                    value: checkString
                },
                signature: checkString
            }, value);
        })
    }, data);
}

export interface TokenSignature {
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export class FungibleToken {

    readonly signer: Signer;
    readonly provider: Provider;

    readonly symbol: string;
    private _state: TokenState;

    constructor(symbol: string, signerOrProvider: Signer | Provider) {
        errors.checkNew(this, FungibleToken);

        if (!symbol) {
            errors.throwError('symbol is required', errors.MISSING_ARGUMENT, { arg: 'symbol' });
        }
        defineReadOnly(this, 'symbol', symbol);

        if (Signer.isSigner(signerOrProvider)) {
            if (!signerOrProvider.provider) {
                return errors.throwError('missing provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
            }
            defineReadOnly(this, 'provider', signerOrProvider.provider);
            defineReadOnly(this, 'signer', signerOrProvider);
        } else if (Provider.isProvider(signerOrProvider)) {
            defineReadOnly(this, 'provider', signerOrProvider);
            defineReadOnly(this, 'signer', null);
        } else {
            errors.throwError('invalid signer or provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
        }
    }

    get state() { return this._state; }

    refresh() {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.provider.getTokenState(this.symbol).then((result) => {
            if (!result) {
                errors.throwError('token state is not available', errors.NOT_AVAILABLE, {});
            }
            if ("fungible" != result.type) {
                errors.throwError('class type mismatch', errors.UNEXPECTED_RESULT, { expected: "fungible", returned: result });
            }
            if (this.symbol != result.symbol) {
                errors.throwError('token symbol mismatch', errors.UNEXPECTED_RESULT, { expected: this.symbol, returned: result });
            }

            this._state = result;
            return;
        });
    }

    /**
     * Query token balance
     * @param blockTag reserved for future
     * @param overrides options
     */
    getBalance(blockTag?: BlockTag, overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                errors.throwError('query fungible token balance require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.getTokenAccountState(this.symbol, signerAddress, blockTag).then((result) => {
                if (result && result.balance) {
                    return bigNumberify(result.balance);
                }
                return bigNumberify("0");
            });
        });
    }

    /**
     * Transfer token by wallet
     * @param toAddressOrName receiver address
     * @param value number of token to transfer
     * @param overrides options
     */
    transfer(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('transfer fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.resolveName(toAddressOrName).then((toAddress) => {
                let transaction: TransactionRequest = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/transferFungibleToken",
                                value: {
                                    symbol: this.symbol,
                                    from: signerAddress,
                                    to: toAddress,
                                    value: value.toString()
                                }
                            }
                        ],
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    },
                    fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTokenTransactionFee(this.symbol, "transfer")
                };

                return this.signer.sendTransaction(transaction, overrides).then((response) => {
                    if (overrides && overrides.sendOnly) {
                        return response;
                    }
                    let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                    return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                        if (1 == receipt.status) {
                            return receipt;
                        }
                        return errors.throwError("transfer fungible token failed", errors.CALL_EXCEPTION, {
                            method: "token/transferFungibleToken",
                            response: response,
                            receipt: receipt
                        });
                    });
                });
            });
        });
    }

    /**
     * Mint token by owner
     * @param toAddressOrName receiver address
     * @param value number of token to mint
     * @param overrides options
     */
    mint(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('mint fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('mint fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.resolveName(toAddressOrName).then((toAddress) => {
                let transaction: TransactionRequest = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/mintFungibleToken",
                                value: {
                                    symbol: this.symbol,
                                    to: toAddress,
                                    value: value.toString(),
                                    owner: signerAddress
                                }
                            }
                        ],
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    },
                    fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee("token", "token-mintFungibleToken")
                };

                return this.signer.sendTransaction(transaction, overrides).then((response) => {
                    if (overrides && overrides.sendOnly) {
                        return response;
                    }
                    let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                    return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                        if (1 == receipt.status) {
                            return receipt;
                        }
                        return errors.throwError("mint fungible token failed", errors.CALL_EXCEPTION, {
                            method: "token/mintFungibleToken",
                            response: response,
                            receipt: receipt
                        });
                    });
                });
            });
        });
    }

    /**
     * Burn token by wallet
     * @param value number of token to burn
     * @param overrides options
     */
    burn(value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('burn fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('burn fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            let transaction: TransactionRequest = {
                type: "cosmos-sdk/StdTx",
                value: {
                    msg: [
                        {
                            type: "token/burnFungibleToken",
                            value: {
                                symbol: this.symbol,
                                from: signerAddress,
                                value: value.toString()
                            }
                        }
                    ],
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                },
                fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee("token", "token-burnFungibleToken")
            };

            return this.signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("burn fungible token failed", errors.CALL_EXCEPTION, {
                        method: "token/burnFungibleToken",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    /**
     * Freeze wallet token by owner
     * @param addressOrName target address
     * @param overrides options
     */
    freeze(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('freeze fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress(), addressOrName: addressOrName }).then(({ signerAddress, addressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('freeze fungible token require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }

            return this.provider.resolveName(addressOrName).then((targetAddress) => {
                let transaction: TransactionRequest = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/freezeFungibleToken",
                                value: {
                                    symbol: this.symbol,
                                    target: targetAddress,
                                    owner: signerAddress
                                }
                            }
                        ],
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    },
                    fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee("token", "token-freeze")
                };

                return this.signer.sendTransaction(transaction, overrides).then((response) => {
                    if (overrides && overrides.sendOnly) {
                        return response;
                    }
                    let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                    return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                        if (1 == receipt.status) {
                            return receipt;
                        }
                        return errors.throwError("freeze fungible token failed", errors.CALL_EXCEPTION, {
                            method: "token/freezeFungibleToken",
                            response: response,
                            receipt: receipt
                        });
                    });
                });
            });
        });
    }

    /**
     * Unfreeze wallet token by owner
     * @param addressOrName target address
     * @param overrides options
     */
    unfreeze(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('unfreeze fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress(), addressOrName: addressOrName }).then(({ signerAddress, addressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('unfreeze fungible token require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }

            return this.provider.resolveName(addressOrName).then((targetAddress) => {
                let transaction: TransactionRequest = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/unfreezeFungibleToken",
                                value: {
                                    symbol: this.symbol,
                                    target: targetAddress,
                                    owner: signerAddress
                                }
                            }
                        ],
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    },
                    fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee("token", "token-unfreeze")
                };

                return this.signer.sendTransaction(transaction, overrides).then((response) => {
                    if (overrides && overrides.sendOnly) {
                        return response;
                    }
                    let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                    return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                        if (1 == receipt.status) {
                            return receipt;
                        }
                        return errors.throwError("unfreeze fungible token failed", errors.CALL_EXCEPTION, {
                            method: "token/unfreezeFungibleToken",
                            response: response,
                            receipt: receipt
                        });
                    });
                });
            });
        });
    }

    /**
     * Transfer token ownership
     * @param addressOrName new owner address
     * @param overrides options
     */
    transferOwnership(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return Promise.reject();
    }

    /**
     * Accept ownership by new owner
     * @param overrides options
     */
    acceptOwnership(overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return Promise.reject();
    }

    /**
     * Load token instance by symbol
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol: string, signerOrProvider: Signer | Provider, overrides?: any) {
        let token = new FungibleToken(symbol, signerOrProvider);

        return token.refresh().then(() => {
            return token;
        });
    }

    /**
     * Create fungible token
     * @param properties token properties
     * @param signer signer wallet
     * @param overrides options
     */
    static create(properties: FungibleTokenProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | FungibleToken> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('create fungible token transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }

        checkProperties(properties, {
            name: true,
            symbol: true,
            decimals: true,
            fixedSupply: true,
            totalSupply: true,
            fee: true,
            owner: false, // optional
            metadata: false // optional
        }, true);
        checkProperties(properties.fee, { to: true, value: true });

        return resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('create fungible token transaction require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.owner = address; // Set signer address as owner

            let fungibleToken: FungibleTokenProperties = checkFormat(formatFungibleToken, properties);
            if (bigNumberify(fungibleToken.fee.value).lte(0)) {
                errors.throwError('create fungible token transaction require non-zero application fee', errors.MISSING_FEES, { value: fungibleToken });
            }

            let transaction = signer.provider.getTransactionRequest("token", "token-createFungibleToken", {
                appFeeTo: fungibleToken.fee.to,
                appFeeValue: fungibleToken.fee.value.toString(),
                name: fungibleToken.name,
                owner: fungibleToken.owner,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                decimals: fungibleToken.decimals,
                fixedSupply: fungibleToken.fixedSupply,
                metadata: fungibleToken.metadata || "",
                symbol: fungibleToken.symbol,
                totalSupply: fungibleToken.totalSupply
            });
            transaction.fee = signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });

            return signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response as any;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.fromSymbol(properties.symbol, signer, overrides);
                    }
                    return errors.throwError("create fungible token failed", errors.CALL_EXCEPTION, {
                        method: "token/createFungibleToken",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    /**
     * Sign fungible token status transaction by issuer
     * @param transaction fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signFungibleTokenStatusTransaction(transaction: FungibleTokenStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('sign fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenStatus(transaction);

        return resolveProperties({
            signerAddress: signer.getAddress(),
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            // Convert number and big number to string
            transaction = iterate(transaction, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            transaction = sortObject(transaction);

            return signer.signMessage(JSON.stringify(transaction.payload), true).then((signature) => {
                transaction.signatures.push({
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: base64Encode(signature)
                });
                return transaction;
            });
        });
    }

    /**
     * Sign fungible token account status transaction by issuer
     * @param transaction fungible token account status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signFungibleTokenAccountStatusTransaction(transaction: FungibleTokenAccountStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('sign fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenAccountStatus(transaction);

        return resolveProperties({
            signerAddress: signer.getAddress(),
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            // Convert number and big number to string
            transaction = iterate(transaction, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            transaction = sortObject(transaction);

            return signer.signMessage(JSON.stringify(transaction.payload), true).then((signature) => {
                transaction.signatures.push({
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: base64Encode(signature)
                });
                return transaction;
            });
        });
    }

    /**
     * Send fungible token status transaction by middleware
     * @param transaction fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendFungibleTokenStatusTransaction(transaction: FungibleTokenStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('send fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenStatus(transaction);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("token", "token-setFungibleTokenStatus", {
                payload: transaction.payload,
                signatures: transaction.signatures,
                owner: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
            });
            tx.fee = signer.provider.getTransactionFee(undefined, undefined, { tx });

            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("set fungible token status failed", errors.CALL_EXCEPTION, {
                        method: "token/setFungibleTokenStatus",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    /**
 * Send fungible token account status transaction by middleware
 * @param transaction fungible token account status transaction
 * @param signer signer wallet
 * @param overrides options
 */
    static sendFungibleTokenAccountStatusTransaction(transaction: FungibleTokenAccountStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('send fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenAccountStatus(transaction);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("token", "token-setFungibleTokenAccountStatus", {
                payload: transaction.payload,
                signatures: transaction.signatures,
                owner: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
            });
            tx.fee = signer.provider.getTransactionFee(undefined, undefined, { tx });

            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("set fungible token account status failed", errors.CALL_EXCEPTION, {
                        method: "token/setFungibleTokenAccountStatus",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    /**
     * Approve fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setFungibleTokenStatus(symbol, "APPROVE", signer, overrides);
    }

    /**
     * Reject fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setFungibleTokenStatus(symbol, "REJECT", signer, overrides);
    }

    /**
     * Freeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setFungibleTokenStatus(symbol, "FREEZE", signer, overrides);
    }

    /**
     * Unfreeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setFungibleTokenStatus(symbol, "UNFREEZE", signer, overrides);
    }

    /**
     * Freeze fungible token account by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeFungibleTokenAccount(symbol: string, to: string, signer: Signer, overrides?: any) {
        return setFungibleTokenAccountStatus(symbol, to, "FREEZE_ACCOUNT", signer, overrides);
    }

    /**
     * Unfreeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeFungibleTokenAccount(symbol: string, to: string, signer: Signer, overrides?: any) {
        return setFungibleTokenAccountStatus(symbol, to, "UNFREEZE_ACCOUNT", signer, overrides);
    }

}

function setFungibleTokenStatus(symbol: string, status: string, signer: Signer, overrides?: any) {
    if (!Signer.isSigner(signer)) {
        errors.throwError('set fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!symbol) {
        errors.throwError('set fungible token status transaction require symbol', errors.MISSING_ARGUMENT, { arg: 'symbol' });
    }

    let transferFee = "0";
    let burnable = false;

    switch (status) {
        case "APPROVE":
            if (!overrides || !overrides.transferFee || !BigNumber.isBigNumber(overrides.transferFee)) {
                errors.throwError('fungible token transfer fee is missing', errors.MISSING_ARGUMENT, { arg: 'transferFee' });
            }
            if (overrides.transferFee.lte(0)) {
                errors.throwError('fungible token transfer fee require more than zero', errors.INVALID_ARGUMENT, { arg: 'transferFee' });
            }
            transferFee = overrides.transferFee.toString();

            if (isUndefinedOrNull(overrides.burnable)) {
                errors.throwError('fungible token burnable setting is missing', errors.MISSING_ARGUMENT, { arg: 'burnable' });
            }
            burnable = overrides.burnable ? true : false;
            break;

        case "REJECT":
        case "FREEZE":
        case "UNFREEZE":
            break;

        default:
            errors.throwError('invalid fungible token status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
    }

    return resolveProperties({
        signerAddress: signer.getAddress(),
        publicKeyType: signer.getPublicKeyType(),
        compressedPublicKey: signer.getCompressedPublicKey()
    }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
        let nonce = overrides ? overrides.nonce : undefined;
        if (!nonce) {
            nonce = signer.provider.getTransactionCount(signerAddress, "pending");
        }

        return resolveProperties({ nonce: nonce }).then(({ nonce }) => {
            let transaction: FungibleTokenStatusTransaction = sortObject({
                payload: {
                    token: {
                        from: signerAddress,
                        nonce: nonce.toString(),
                        status,
                        symbol,
                        transferFee,
                        burnable
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            });

            return signer.signMessage(JSON.stringify(transaction.payload.token), true).then((signature) => {
                transaction.payload.signature = base64Encode(signature);
                return transaction;
            });
        });
    });
}

function setFungibleTokenAccountStatus(symbol: string, to: string, status: string, signer: Signer, overrides?: any) {
    if (!Signer.isSigner(signer)) {
        errors.throwError('set fungible token account status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!symbol) {
        errors.throwError('set fungible token account status transaction require symbol', errors.MISSING_ARGUMENT, { arg: 'symbol' });
    }
    if (!to) {
        errors.throwError('set fungible token account status transaction require target account', errors.MISSING_ARGUMENT, { arg: 'to' });
    }

    switch (status) {
        case "FREEZE_ACCOUNT":
        case "UNFREEZE_ACCOUNT":
            try {
                to = checkAddress(to);
            }
            catch (error) {
                errors.throwError('fungible token target account is not valid', errors.INVALID_ADDRESS, { arg: 'to', value: to });
            }
            break;

        default:
            errors.throwError('invalid fungible token account status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
    }

    return resolveProperties({
        signerAddress: signer.getAddress(),
        publicKeyType: signer.getPublicKeyType(),
        compressedPublicKey: signer.getCompressedPublicKey()
    }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
        let nonce = overrides ? overrides.nonce : undefined;
        if (!nonce) {
            nonce = signer.provider.getTransactionCount(signerAddress, "pending");
        }

        return resolveProperties({ nonce: nonce }).then(({ nonce }) => {
            let transaction: FungibleTokenAccountStatusTransaction = sortObject({
                payload: {
                    tokenAccount: {
                        from: signerAddress,
                        nonce: nonce.toString(),
                        status,
                        symbol,
                        to
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            });

            return signer.signMessage(JSON.stringify(transaction.payload.tokenAccount), true).then((signature) => {
                transaction.payload.signature = base64Encode(signature);
                return transaction;
            });
        });
    });
}
