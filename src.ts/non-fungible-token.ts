'use strict';

import { defineReadOnly, resolveProperties, checkProperties } from './utils/properties';
import { sortObject, checkFormat, arrayOf, checkAddress, checkString, checkBigNumber, allowNullOrEmpty, iterate, isUndefinedOrNullOrEmpty, checkAny, checkBoolean, checkBigNumberString } from './utils/misc';
import { encode as base64Encode } from './utils/base64';
import * as errors from './errors';

// Imported Abstracts
import { Provider } from './providers/abstract-provider';
import { Signer } from './abstract-signer';

import {
    TransactionReceipt, TransactionResponse, BlockTag,
    NFTokenState
} from './providers/abstract-provider';

import { BigNumber, bigNumberify } from './utils';

export enum NonFungibleTokenActions {
    transfer = "transfer",
    mint = "mint",
    burn = "burn",
    transferOwnership = "transferOwnership",
    acceptOwnership = "acceptOwnership",
};

export enum NFTokenStateFlags {
    nonfungible = 0x0001,
    mint = 0x0002,
    burn = 0x0004,
    frozen = 0x0008,
    approved = 0x0010,
    transferable = 0x0020,
    modifiable = 0x0040,
    public = 0x0080
};

export interface NonFungibleTokenProperties {
    name: string,
    symbol: string,
    fee: {
        to: string,
        value: BigNumber
    },
    metadata?: string,
    properties?: string,
}

export interface NonFungibleTokenFee {
    action: string,
    feeName: string
}

export interface NonFungibleTokenItem {
    symbol: string,
    itemID: string,
    properties?: string,
    metadata?: string
}

export interface NonFungibleTokenSignature {
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export interface NonFungibleTokenStatus {
    token: {
        endorserList?: string[],
        from: string,
        mintLimit: BigNumber,
        nonce: BigNumber,
        status: string,
        symbol: string,
        tokenFees?: NonFungibleTokenFee[],
        transferLimit: BigNumber,
        burnable: boolean,
        transferable: boolean,
        modifiable: boolean,
        pub: boolean
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export interface NonFungibleTokenItemStatus {
    item: {
        from: string,
        nonce: BigNumber,
        status: string,
        symbol: string,
        itemID: string
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export interface NonFungibleTokenStatusTransaction {
    payload: NonFungibleTokenStatus,
    signatures: NonFungibleTokenSignature[]
}

export interface NonFungibleTokenItemStatusTransaction {
    payload: NonFungibleTokenItemStatus,
    signatures: NonFungibleTokenSignature[]
}

export class NonFungibleToken {

    readonly signer: Signer;
    readonly provider: Provider;

    readonly symbol: string;
    private _state: NFTokenState;

    constructor(symbol: string, signerOrProvider: Signer | Provider) {
        errors.checkNew(this, NonFungibleToken);

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

    get isApproved() {
        if (isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (NFTokenStateFlags.approved & this._state.flags) ? true : false;
    }

    get isFrozen() {
        if (isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (NFTokenStateFlags.frozen & this._state.flags) ? true : false;
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

    refresh(overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.getState(null, { ...overrides, queryOnly: true }).then((state) => {
            this._state = state;
            return this;
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
        return this.provider.getNFTokenState(this.symbol, blockTag).then((result) => {
            if (!result) {
                errors.throwError('token state is not available', errors.NOT_AVAILABLE, {});
            }
            if (!(NFTokenStateFlags.nonfungible & result.flags)) {
                errors.throwError('class type mismatch', errors.UNEXPECTED_RESULT, { expected: "nonfungible", returned: result });
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
    * Transfer token ownership
    * @param addressOrName new owner address
    * @param overrides options
    */
    transferOwnership(addressOrName: string | Promise<string>, overrides?: any) {
        if (!this.signer) {
            errors.throwError('transfer non fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress(), addressOrName: addressOrName }).then(({ signerAddress, addressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer non fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }

            return this.provider.resolveName(addressOrName).then((toAddress) => {
                let transaction = this.provider.getTransactionRequest("nonFungible", "transferNonFungibleTokenOwnership", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx: transaction });

                return this.signer.sendTransaction(transaction, overrides).then((response) => {
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
                        throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer non fungible token ownership failed", {
                            method: "nonFungible-transferNonFungibleTokenOwnership",
                            receipt
                        });
                    });
                });
            });
        });
    }

    /**
    * Accept ownership by new owner
    * @param overrides options
    */
    acceptOwnership(overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('accept fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        this.isUsable; // check token useability, otherwise throw error

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('accept fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }

            let transaction = this.provider.getTransactionRequest("nonFungible", "acceptNonFungibleTokenOwnership", {
                symbol: this.symbol,
                from: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx: transaction });

            return this.signer.sendTransaction(transaction, overrides).then((response) => {
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
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "accept non fungible token ownership failed", {
                        method: "token-acceptNonFungibleTokenOwnership",
                        response: response,
                        receipt
                    });
                });
            });
        });
    }


    /**
     * Load token instance by symbol
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol: string, signerOrProvider: Signer | Provider, overrides?: any) {
        let token = new NonFungibleToken(symbol, signerOrProvider);
        return token.refresh(overrides).then(() => {
            return token;
        });
    }

    /**
     * Create non-fungible token
     * @param properties token properties
     * @param signer signer wallet
     * @param overrides options
     */
    static create(tokenProperties: NonFungibleTokenProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | NonFungibleToken> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('create non fungible token transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (tokenProperties && 'string' === typeof (tokenProperties)) {
            tokenProperties = JSON.parse(tokenProperties);
        }

        checkProperties(tokenProperties, {
            name: true,
            symbol: true,
            fee: true, // Application fee
            metadata: false, // Optional
            properties: false  //Optional
        }, true);
        checkProperties(tokenProperties.fee, { to: true, value: true });

        return resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('create non fungible token transaction require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }

            let nonFungibleToken: NonFungibleTokenProperties = checkFormat({
                name: checkString,
                symbol: checkString,
                metadata: allowNullOrEmpty(checkString),
                properties: allowNullOrEmpty(checkString),
                fee: {
                    to: checkAddress,
                    value: checkBigNumber
                }
            }, tokenProperties);
            if (bigNumberify(nonFungibleToken.fee.value).lte(0)) {
                errors.throwError('create non fungible token transaction require non-zero application fee', errors.MISSING_FEES, { value: nonFungibleToken });
            }

            let transaction = signer.provider.getTransactionRequest("nonFungible", "createNonFungibleToken", {
                appFeeTo: nonFungibleToken.fee.to,
                appFeeValue: nonFungibleToken.fee.value.toString(),
                name: nonFungibleToken.name,
                owner: address,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                metadata: nonFungibleToken.metadata || "",
                properties: nonFungibleToken.properties || "",
                symbol: nonFungibleToken.symbol
            });
            transaction.fee = signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });

            return signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.fromSymbol(tokenProperties.symbol, signer, overrides);
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create non fungible token failed", {
                        method: "nonFungible-createNonFungibleToken",
                        receipt
                    });
                });
            });
        });
    }

    /**
   * Update non-fungible token metadata
   * @param metadata new metadata
   * @param overrides options
   */
    updateMetadata(metadata?: string, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('update non fungible token item metadata require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ address: this.signer.getAddress() }).then(({ address }) => {
            if (!address) {
                return errors.throwError('update non fungible token item metadata require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            let transaction = this.signer.provider.getTransactionRequest("nonFungible", "updateNFTMetadata", {
                symbol: this.symbol,
                from: address,
                metadata
            });
            transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });

            return this.signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "update non fungible token item metadata failed", {
                        method: "nonfungible-updateMetadata",
                        receipt
                    });
                });
            });
        });
    }

    /**
    * Mint NFT item
    * @param toAddressOrName receiver address
    * @param item item to mint
    * @param overrides options
    */
    mint(toAddressOrName: string | Promise<string>, item: NonFungibleTokenItem, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.signer) {
            errors.throwError('transfer non fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        checkProperties(item, { symbol: true, itemID: true, properties: true, metadata: true });

        return resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('mint fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.signer.provider.resolveName(toAddressOrName).then((toAddress) => {
                let transaction = this.signer.provider.getTransactionRequest("nonFungible", "mintNonFungibleItem", {
                    symbol: item.symbol,
                    to: toAddress,
                    itemID: item.itemID,
                    owner: signerAddress,
                    properties: item.properties || "",
                    metadata: item.metadata || "",
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });

                return this.signer.sendTransaction(transaction, overrides).then((response) => {
                    if (overrides && overrides.sendOnly) {
                        return response;
                    }
                    let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                    return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                        if (1 == receipt.status) {
                            return receipt;
                        }
                        throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "mint non fungible token failed", {
                            method: "nonFungible-mintNonFungibleToken",
                            receipt
                        });
                    });
                });
            });
        });
    }
    /**
     * Sign non fungible token status transaction by issuer
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signNonFungibleTokenStatusTransaction(transaction: NonFungibleTokenStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('sign non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenStatus(transaction);

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
     * Sign non fungible token item status transaction by issuer
     * @param transaction non fungible token item status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signNonFungibleTokenItemStatusTransaction(transaction: NonFungibleTokenItemStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('sign non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenItemStatus(transaction);

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
     * Approve non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveNonFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenStatus(symbol, "APPROVE", signer, overrides);
    }

    /**
     * Reject non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectNonFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenStatus(symbol, "REJECT", signer, overrides);
    }

    /**
     * Freeze non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeNonFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenStatus(symbol, "FREEZE", signer, overrides);
    }

    /**
     * Unfreeze non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeNonFungibleToken(symbol: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenStatus(symbol, "UNFREEZE", signer, overrides);
    }

    /**
     * Approve non fungible token ownership by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveNonFungibleTokenOwnership(symbol: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenStatus(symbol, "APPROVE_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }

    /**
     * Reject fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectNonFungibleTokenOwnership(symbol: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenStatus(symbol, "REJECT_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }

    /**
     * Send non fungible token status transaction by middleware
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendNonFungibleTokenStatusTransaction(transaction: NonFungibleTokenStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('send non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenStatus(transaction);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("nonFungible", "setNonFungibleTokenStatus", {
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
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set non fungible token status failed", {
                        method: "nonFungible-setNonFungibleTokenStatus",
                        receipt
                    });
                });
            });
        });
    }

    /**
     * Send non fungible token item status transaction by middleware
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendNonFungibleTokenItemStatusTransaction(transaction: NonFungibleTokenItemStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('send non fungible token item status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenItemStatus(transaction);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("nonFungible", "setNonFungibleItemStatus", {
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
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set non fungible token item status failed", {
                        method: "nonFungible-setNonFungibleItemStatus",
                        receipt
                    });
                });
            });
        });
    }

    /**
     * Freeze NFT item by provider
     * @param symbol token item symbol
     * @param itemID token item id
     * @param overrides options
     */
    static freezeNonFungibleTokenItem(symbol: string, itemID: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenItemStatus(symbol, itemID, "FREEZE_ITEM", signer, overrides);
    }

    /**
     * Unfreeze NFT item by provider
     * @param symbol token item symbol
     * @param itemID token item id
     * @param overrides options
     */
    static unfreezeNonFungibleTokenItem(symbol: string, itemID: string, signer: Signer, overrides?: any) {
        return setNonFungibleTokenItemStatus(symbol, itemID, "UNFREEZE_ITEM", signer, overrides);
    }
}

function checkNonFungibleTokenFee(data: any): NonFungibleTokenFee {
    let fee: NonFungibleTokenFee = checkFormat({
        action: checkString,
        feeName: checkString
    }, data);

    if (isUndefinedOrNullOrEmpty(NonFungibleTokenActions[fee.action])) {
        return errors.throwError("invalid non fungible token fee", errors.INVALID_ARGUMENT, { value: fee });
    }
    return fee;
}

function setNonFungibleTokenStatus(symbol: string, status: string, signer: Signer, overrides?: any) {
    if (!Signer.isSigner(signer)) {
        errors.throwError('set non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }

    checkProperties({ symbol, status }, { symbol: true, status: true });

    let tokenFees: NonFungibleTokenFee[];
    let mintLimit: string, transferLimit: string;
    let endorserList: string[] = null;
    let burnable: boolean, transferable: boolean, modifiable: boolean, pub: boolean;

    burnable = (overrides && overrides.burnable) ? true : false;
    transferable = (overrides && overrides.transferable) ? true : false;
    modifiable = (overrides && overrides.modifiable) ? true : false;
    pub = (overrides && overrides.pub) ? true : false;

    switch (status) {
        case "APPROVE":
            let params: {
                mintLimit: string,
                transferLimit: string

            } = checkFormat({
                mintLimit: checkBigNumberString,
                transferLimit: checkBigNumberString,
            }, overrides);

            mintLimit = params.mintLimit;
            transferLimit = params.transferLimit;

            if (overrides) {
                if (overrides.tokenFees) {
                    let tokenProperties = checkFormat({
                        tokenFees: arrayOf(checkNonFungibleTokenFee)
                    }, overrides);
                    tokenFees = tokenProperties.tokenFees;
                }

                if (overrides.endorserList) {
                    let endorsers = checkFormat({
                        endorserList: allowNullOrEmpty(arrayOf(checkString))
                    }, overrides);

                    endorserList = endorsers.endorserList;
                    if (endorserList.length == 0) endorserList = null;
                }
            }
            if (isUndefinedOrNullOrEmpty(tokenFees)) {
                errors.throwError('non fungible token fees are missing', errors.MISSING_ARGUMENT, { arg: 'tokenFees' });
            }
            break;

        case "APPROVE_TRANFER_TOKEN_OWNERSHIP":
        case "REJECT_TRANFER_TOKEN_OWNERSHIP":
        case "REJECT":
            mintLimit = "0";
            transferLimit = "0";
            endorserList = null;

            break;

        case "FREEZE":
        case "UNFREEZE":
            break;

        default:
            errors.throwError('invalid non fungible token status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
            let transaction: NonFungibleTokenStatusTransaction = sortObject(iterate({
                payload: {
                    token: {
                        from: signerAddress,
                        nonce,
                        status,
                        symbol,
                        transferLimit,
                        mintLimit,
                        tokenFees,
                        endorserList,
                        burnable,
                        transferable,
                        modifiable,
                        pub
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

function checkNonFungibleTokenStatus(data: any): NonFungibleTokenStatusTransaction {
    return checkFormat({
        payload: function (value: any): NonFungibleTokenStatus {
            return checkFormat({
                token: {
                    endorserList: checkAny,
                    from: checkAddress,
                    mintLimit: checkBigNumber,
                    nonce: checkBigNumber,
                    status: checkString,
                    symbol: checkString,
                    tokenFees: allowNullOrEmpty(arrayOf(checkNonFungibleTokenFee)),
                    transferLimit: checkBigNumber,
                    burnable: checkBoolean,
                    transferable: checkBoolean,
                    modifiable: checkBoolean,
                    pub: checkBoolean
                },
                pub_key: {
                    type: checkString,
                    value: checkString
                },
                signature: checkString
            }, value);
        },
        signatures: arrayOf(function (value: any): NonFungibleTokenSignature {
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

function setNonFungibleTokenItemStatus(symbol: string, itemID: string, status: string, signer: Signer, overrides?: any) {
    if (!Signer.isSigner(signer)) {
        errors.throwError('set non fungible token item status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!symbol) {
        errors.throwError('set non fungible token item status transaction require symbol', errors.MISSING_ARGUMENT, { arg: 'symbol' });
    }
    if (!itemID) {
        errors.throwError('set non fungible token item status transaction require itemID', errors.MISSING_ARGUMENT, { arg: 'itemID' });
    }

    switch (status) {
        case "FREEZE_ITEM":
        case "UNFREEZE_ITEM":
            break;

        default:
            errors.throwError('invalid non fungible token item status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
            let transaction: NonFungibleTokenItemStatusTransaction = sortObject(iterate({
                payload: {
                    item: {
                        from: signerAddress,
                        nonce,
                        status,
                        symbol,
                        itemID
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

            return signer.signMessage(JSON.stringify(transaction.payload.item), true).then((signature) => {
                transaction.payload.signature = base64Encode(signature);
                return transaction;
            });
        });
    });
}

function checkNonFungibleTokenItemStatus(data: any): NonFungibleTokenItemStatusTransaction {
    return checkFormat({
        payload: function (value: any): NonFungibleTokenItemStatus {
            return checkFormat({
                item: {
                    from: checkAddress,
                    nonce: checkBigNumber,
                    status: checkString,
                    symbol: checkString,
                    itemID: checkString
                },
                pub_key: {
                    type: checkString,
                    value: checkString
                },
                signature: checkString
            }, value);
        },
        signatures: arrayOf(function (value: any): NonFungibleTokenSignature {
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