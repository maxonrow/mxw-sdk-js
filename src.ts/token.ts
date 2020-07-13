'use strict';

import { defineReadOnly, resolveProperties, checkProperties } from './utils/properties';
import { sortObject, checkFormat, arrayOf, checkAddress, checkString, checkNumber, checkBigNumber, checkBoolean, allowNullOrEmpty, allowNull, iterate, isUndefinedOrNull, isUndefinedOrNullOrEmpty } from './utils/misc';
import { encode as base64Encode } from './utils/base64';

import * as errors from './errors';

// Imported Abstracts
import { Provider, TokenAccountState, TransactionRequest } from './providers/abstract-provider';
import { Signer } from './abstract-signer';

///////////////////////////////
// Imported Types

import {
    TransactionReceipt, TransactionResponse, BlockTag,
    TokenState
} from './providers/abstract-provider';
import { BigNumberish, BigNumber, bigNumberify } from './utils';

export enum FungibleTokenActions {
    transfer = "transfer",
    mint = "mint",
    burn = "burn",
    transferOwnership = "transferOwnership",
    acceptOwnership = "acceptOwnership",
};

export enum TokenStateFlags {
    fungible = 0x0001,
    mint = 0x0002,
    burn = 0x0004,
    frozen = 0x0008,
    approved = 0x0010
};

export const DynamicSupplyFungibleTokenFlag = TokenStateFlags.fungible + TokenStateFlags.mint + TokenStateFlags.burn;
export const FixedSupplyFungibleTokenFlag = TokenStateFlags.fungible;
export const FixedSupplyBurnableFungibleTokenFlag = TokenStateFlags.fungible + TokenStateFlags.burn;

export interface FungibleTokenProperties {
    name: string,
    symbol: string,
    decimals: number,
    fixedSupply: boolean,
    maxSupply: BigNumber,
    fee: {
        to: string,
        value: BigNumber
    },
    metadata?: string,
    owner?: string,
}

export interface FungibleTokenFee {
    action: string,
    feeName: string
}

export interface FungibleTokenStatus {
    token: {
        from: string,
        nonce: BigNumber,
        status: string,
        symbol: string,
        tokenFees?: FungibleTokenFee[],
        burnable?: boolean
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
                    tokenFees: allowNullOrEmpty(arrayOf(checkFungibleTokenFee)),
                    burnable: allowNullOrEmpty(checkBoolean)
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

function checkFungibleTokenFee(data: any): FungibleTokenFee {
    let fee: FungibleTokenFee = checkFormat({
        action: checkString,
        feeName: checkString
    }, data);

    if (isUndefinedOrNullOrEmpty(FungibleTokenActions[fee.action])) {
        return errors.throwError("invalid fungible token fee", errors.INVALID_ARGUMENT, { value: fee });
    }
    return fee;
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
    private _accountState: TokenAccountState;

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
    get accountState() { return this._accountState; }

    get isApproved() {
        if (isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (TokenStateFlags.approved & this._state.flags) ? true : false;
    }

    get isFrozen() {
        if (isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (TokenStateFlags.frozen & this._state.flags) ? true : false;
    }

    get isUsable() {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        if (!this.isApproved) {
            errors.throwError('required approval', errors.NOT_ALLOWED, { action: "useability", state: this._state });
        }
        if (this.isFrozen) {
            errors.throwError('frozen', errors.NOT_ALLOWED, { action: "useability", state: this._state });
        }
        return true;
    }

    get isMintable() {
        this.isUsable; // check token useability, otherwise throw error

        if (!(TokenStateFlags.mint & this._state.flags)) {
            errors.throwError('not mintable', errors.NOT_ALLOWED, { action: "mintable", state: this._state });
        }
        return true;
    }

    get isBurnable() {
        this.isUsable; // check token useability, otherwise throw error

        if (!(TokenStateFlags.burn & this._state.flags)) {
            errors.throwError('not burnable', errors.NOT_ALLOWED, { action: "burnable", state: this._state });
        }
        return true;
    }

    refresh(overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.getState(null, { ...overrides, queryOnly: true }).then((state) => {
            if (!this.signer) {
                this._state = state;
                return this;
            }
            return this.getAccountState(null, { ...overrides, queryOnly: true }).then((accountState) => {
                // Update states in one go
                this._state = state;
                this._accountState = accountState;
                return this;
            });
        });
    }

    /**
     * Query token state
     * @param blockTag reserved for future
     * @param overrides options
     */
    getState(blockTag?: BlockTag, overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.provider.getTokenState(this.symbol, blockTag).then((result) => {
            if (!result) {
                errors.throwError('token state is not available', errors.NOT_AVAILABLE, {});
            }
            if (!(TokenStateFlags.fungible & result.flags)) {
                errors.throwError('class type mismatch', errors.UNEXPECTED_RESULT, { expected: "fungible", returned: result });
            }
            if (this.symbol != result.symbol) {
                errors.throwError('token symbol mismatch', errors.UNEXPECTED_RESULT, { expected: this.symbol, returned: result });
            }
            if (!(overrides && overrides.queryOnly)) {
                this._state = result;
            }
            return result;
        });
    }

    /**
     * Query token account
     * @param blockTag reserved for future
     * @param overrides options
     */
    getAccountState(blockTag?: BlockTag, overrides?: any) {
        if (!this.signer) {
            errors.throwError('query fungible token account require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                errors.throwError('query fungible token account require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.getTokenAccountState(this.symbol, signerAddress, blockTag).then((result) => {
                if (!(overrides && overrides.queryOnly)) {
                    this._accountState = result;
                }
                return result;
            });
        });
    }

    /**
     * Query token balance
     * @param blockTag reserved for future
     * @param overrides options
     */
    getBalance(blockTag?: BlockTag, overrides?: any) {
        return this.getAccountState(blockTag, overrides).then((accountState) => {
            if (accountState && accountState.balance) {
                return bigNumberify(accountState.balance);
            }
            return bigNumberify("0");
        });
    }

    /**
     * Transfer token by wallet
     * @param toAddressOrName receiver address
     * @param value number of token to transfer
     * @param overrides options
     */
    transfer(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getTransferTransactionRequest(toAddressOrName, value, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer fungible token failed", {
                        method: "token-transferFungibleToken",
                        receipt
                    });
                });
            });
        });
    }

    getTransferTransactionRequest(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionRequest> {
        if (!this.signer) {
            errors.throwError('transfer fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        this.isUsable; // check token useability, otherwise throw error

        return resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.resolveName(toAddressOrName).then((toAddress) => {
                let tx = this.provider.getTransactionRequest("token", "token-transferFungibleToken", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    value: value.toString(),
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

                return tx;
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
        return this.getMintTransactionRequest(toAddressOrName, value, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "mint fungible token failed", {
                        method: "token-mintFungibleToken",
                        receipt
                    });
                });
            });
        });
    }

    getMintTransactionRequest(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionRequest> {
        if (!this.signer) {
            errors.throwError('mint fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        this.isMintable; // check token useability and mintable, otherwise throw error

        return resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('mint fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.resolveName(toAddressOrName).then((toAddress) => {
                let tx = this.provider.getTransactionRequest("token", "token-mintFungibleToken", {
                    symbol: this.symbol,
                    to: toAddress,
                    value: value.toString(),
                    owner: signerAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

                return tx;
            });
        });
    }

    /**
     * Burn token by wallet
     * @param value number of token to burn
     * @param overrides options
     */
    burn(value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getBurnTransactionRequest(value, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "burn fungible token failed", {
                        method: "token-burnFungibleToken",
                        receipt
                    });
                });
            });
        });
    }

    getBurnTransactionRequest(value: BigNumberish, overrides?: any): Promise<TransactionRequest> {
        if (!this.signer) {
            errors.throwError('burn fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        this.isBurnable; // check token useability and burnable, otherwise throw error

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('burn fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            let tx = this.provider.getTransactionRequest("token", "token-burnFungibleToken", {
                symbol: this.symbol,
                from: signerAddress,
                value: value.toString(),
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

            return tx;
        });
    }

    /**
     * Transfer token ownership
     * @param addressOrName new owner address
     * @param overrides options
     */
    transferOwnership(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getTransferOwnershipTransactionRequest(addressOrName, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.getState(null, overrides).then(() => {
                            return receipt;
                        });
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer fungible token ownership failed", {
                        method: "token-transferFungibleTokenOwnership",
                        receipt
                    });
                });
            });
        });
    }

    getTransferOwnershipTransactionRequest(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionRequest> {
        if (!this.signer) {
            errors.throwError('transfer fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        this.isUsable; // check token useability, otherwise throw error

        return resolveProperties({ signerAddress: this.signer.getAddress(), addressOrName: addressOrName }).then(({ signerAddress, addressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }

            return this.provider.resolveName(addressOrName).then((toAddress) => {
                let tx = this.provider.getTransactionRequest("token", "token-transferFungibleTokenOwnership", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

                return tx;
            });
        });
    }

    /**
     * Accept ownership by new owner
     * @param overrides options
     */
    acceptOwnership(overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getAcceptOwnershipTransactionRequest(overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.getState(null, overrides).then(() => {
                            return receipt;
                        });
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "accept fungible token ownership failed", {
                        method: "token-acceptFungibleTokenOwnership",
                        response: response,
                        receipt
                    });
                });
            });
        });
    }

    getAcceptOwnershipTransactionRequest(overrides?: any): Promise<TransactionRequest> {
        if (!this.signer) {
            errors.throwError('accept fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        this.isUsable; // check token useability, otherwise throw error

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('accept fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }

            let tx = this.provider.getTransactionRequest("token", "token-acceptFungibleTokenOwnership", {
                symbol: this.symbol,
                from: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

            return tx;
        });
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
        return this.getCreateTransactionRequest(properties, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.fromSymbol(properties.symbol, signer, overrides);
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create fungible token failed", {
                        method: "token-createFungibleToken",
                        receipt
                    });
                });
            });
        });
    }

    static getCreateTransactionRequest(properties: FungibleTokenProperties, signer: Signer, overrides?: any): Promise<TransactionRequest> {
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
            maxSupply: true,
            fee: true, // Application fee
            owner: false, // Optional
            metadata: false // Optional
        }, true);
        checkProperties(properties.fee, { to: true, value: true });

        return resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('create fungible token transaction require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.owner = address; // Set signer address as owner

            let fungibleToken: FungibleTokenProperties = checkFormat({
                name: checkString,
                symbol: checkString,
                decimals: checkNumber,
                fixedSupply: checkBoolean,
                maxSupply: checkBigNumber,
                owner: allowNull(checkAddress),
                metadata: allowNullOrEmpty(checkString),
                fee: {
                    to: checkAddress,
                    value: checkBigNumber
                }
            }, properties);

            let tx = signer.provider.getTransactionRequest("token", "token-createFungibleToken", {
                appFeeTo: fungibleToken.fee.to,
                appFeeValue: fungibleToken.fee.value.toString(),
                name: fungibleToken.name,
                owner: fungibleToken.owner,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                decimals: fungibleToken.decimals,
                fixedSupply: fungibleToken.fixedSupply,
                metadata: fungibleToken.metadata || "",
                symbol: fungibleToken.symbol,
                maxSupply: fungibleToken.maxSupply
            });
            tx.fee = signer.provider.getTransactionFee(undefined, undefined, { tx });

            return tx;
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
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ publicKeyType, compressedPublicKey }) => {
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
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ publicKeyType, compressedPublicKey }) => {
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
    static sendFungibleTokenStatusTransaction(transaction: FungibleTokenStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getFungibleTokenStatusTransactionRequest(transaction, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set fungible token status failed", {
                        method: "token-setFungibleTokenStatus",
                        receipt
                    });
                });
            });
        });
    }

    static getFungibleTokenStatusTransactionRequest(transaction: FungibleTokenStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionRequest> {
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

            return tx;
        });
    }

    /**
     * Send fungible token account status transaction by middleware
     * @param transaction fungible token account status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendFungibleTokenAccountStatusTransaction(transaction: FungibleTokenAccountStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getFungibleTokenAccountStatusTransactionRequest(transaction, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set fungible token account status failed", {
                        method: "token-setFungibleTokenAccountStatus",
                        receipt
                    });
                });
            });
        });
    }

    static getFungibleTokenAccountStatusTransactionRequest(transaction: FungibleTokenAccountStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionRequest> {
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

            return tx;
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
     * Approve fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveFungibleTokenOwnership(symbol: string, signer: Signer, overrides?: any) {
        return setFungibleTokenStatus(symbol, "APPROVE_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }

    /**
     * Reject fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectFungibleTokenOwnership(symbol: string, signer: Signer, overrides?: any) {
        return setFungibleTokenStatus(symbol, "REJECT_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
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

    let tokenFees: FungibleTokenFee[];
    let burnable = true;

    switch (status) {
        case "APPROVE":
            if (overrides) {
                if (isUndefinedOrNull(overrides.burnable)) {
                    errors.throwError('fungible token burnable setting is missing', errors.MISSING_ARGUMENT, { arg: 'burnable' });
                }
                burnable = overrides.burnable ? true : false;

                if (overrides.tokenFees) {
                    let tokenProperties = checkFormat({
                        tokenFees: arrayOf(checkFungibleTokenFee)
                    }, overrides);

                    tokenFees = tokenProperties.tokenFees;
                }
            }
            if (isUndefinedOrNullOrEmpty(tokenFees)) {
                errors.throwError('fungible token fees are missing', errors.MISSING_ARGUMENT, { arg: 'tokenFees' });
            }
            break;

        case "REJECT":
        case "FREEZE":
        case "UNFREEZE":
        case "APPROVE_TRANFER_TOKEN_OWNERSHIP":
        case "REJECT_TRANFER_TOKEN_OWNERSHIP":
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
            let transaction: FungibleTokenStatusTransaction = sortObject(iterate({
                payload: {
                    token: {
                        from: signerAddress,
                        nonce,
                        status,
                        symbol,
                        tokenFees,
                        burnable
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            }, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            }));

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
            let transaction: FungibleTokenAccountStatusTransaction = sortObject(iterate({
                payload: {
                    tokenAccount: {
                        from: signerAddress,
                        nonce,
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
            }, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            }));

            return signer.signMessage(JSON.stringify(transaction.payload.tokenAccount), true).then((signature) => {
                transaction.payload.signature = base64Encode(signature);
                return transaction;
            });
        });
    });
}
