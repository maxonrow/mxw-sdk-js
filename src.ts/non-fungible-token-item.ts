'use strict';

import { defineReadOnly, resolveProperties } from './utils/properties';
import * as errors from './errors';

// Imported Abstracts
import { Provider } from './providers/abstract-provider';
import { Signer } from './abstract-signer';

import {
    TransactionReceipt, TransactionResponse, BlockTag,
    NFTokenItemState
} from './providers/abstract-provider';
import { NonFungibleToken } from './non-fungible-token';

export class NonFungibleTokenItem {

    readonly signer: Signer;
    readonly provider: Provider;

    readonly symbol: string;
    readonly itemID: string;
    private _state: NFTokenItemState;
    private _NFT: NonFungibleToken;

    constructor(symbol: string, itemID: string, signerOrProvider: Signer | Provider) {

        errors.checkNew(this, NonFungibleTokenItem);

        if (!symbol) {
            errors.throwError('symbol is required', errors.MISSING_ARGUMENT, { arg: 'symbol' });
        }
        defineReadOnly(this, 'symbol', symbol);

        if (!itemID) {
            errors.throwError('itemID is required', errors.MISSING_ARGUMENT, { arg: 'itemID' });
        }
        defineReadOnly(this, 'itemID', itemID);

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

    get parent() { return this._NFT; }

    refresh(overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        if (!this.itemID) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'itemID' });
        }

        return this.getState(null, { ...overrides, queryOnly: true }).then((state) => {
            return this.getParent({ ...overrides, queryOnly: true }).then((token) => {
                this._state = state;
                this._NFT = token;

                return this;
            });
        });
    }

    /**
    * Query token item state
    * @param itemID itemID
    * @param blockTag reserved for future
    * 
    */
    getState(blockTag?: BlockTag, overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        if (!this.itemID) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'itemID' });
        }

        return this.provider.getNFTokenItemState(this.symbol, this.itemID, blockTag).then((result) => {
            if (!result) {
                errors.throwError('token item state is not available', errors.NOT_AVAILABLE, { arg: 'itemID' });
            }
            if (this.itemID != result.id) {
                errors.throwError('token item id mismatch', errors.UNEXPECTED_RESULT, { expected: this.itemID, returned: result });
            }
            if (!(overrides && overrides.queryOnly)) {
                this._state = result;
            }
            return result;
        });
    }

    private getParent(overrides?: any) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }

        return NonFungibleToken.fromSymbol(this.symbol, this.signer).then((token) => {
            if (!(overrides && overrides.queryOnly)) {
                this._NFT = token;
            }
            return token;
        })

    }

    /**
     * Load token item instance by symbol and itemID
     * @param symbol token symbol
     * @param itemID token item id
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol: string, itemID: string, signerOrProvider: Signer | Provider, overrides?: any) {

        let tokenItem = new NonFungibleTokenItem(symbol, itemID, signerOrProvider);

        return tokenItem.refresh(overrides).then(() => {
            return tokenItem;
        });


    }

    /**
     * Transfer token item by wallet
     * @param toAddressOrName receiver address
     * @param overrides options
     */
    transfer(toAddressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {

        if (!this.signer) {
            errors.throwError('transfer non fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer non fungible token item require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.signer.provider.resolveName(toAddressOrName).then((toAddress) => {
                let transaction = this.signer.provider.getTransactionRequest("nonFungible", "transferNonFungibleItem", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    itemID: this.itemID,
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
                        throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer non fungible token item failed", {
                            method: "nonFungible-transferNonFungibleToken",
                            receipt
                        });
                    });
                });
            });
        });
    }

    /**
    * Endorse token item by endorser
    * @param overrides options
    */
    endorse(overrides?: any): Promise<TransactionResponse | TransactionReceipt> {

        if (!this.signer) {
            errors.throwError('endorse non fungible token item require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ address: this.signer.getAddress() }).then(({ address }) => {
            if (!address) {
                return errors.throwError('endorse non fungible token item require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            let transaction = this.signer.provider.getTransactionRequest("nonFungible", "endorsement", {
                symbol: this.symbol,
                from: address,
                itemID: this.itemID,
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
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "endorse non fungible token item failed", {
                        method: "nonfungible-endorsement",
                        receipt
                    });
                });
            });
        });
    }

    /**
    * Update token item metadata
    * @param metadata metadata to update
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

            let transaction = this.signer.provider.getTransactionRequest("nonFungible", "updateItemMetadata", {
                symbol: this.symbol,
                from: address,
                itemID: this.itemID,
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
                        method: "nonfungible-updateItemMetadata",
                        receipt
                    });
                });
            });
        });
    }

    /**
  * Burn non-fungible token item
  * @param overrides options
  */
    burn(overrides?: any) {
        if (!this.signer) {
            errors.throwError('burn non fungible token item require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ address: this.signer.getAddress() }).then(({ address }) => {
            if (!address) {
                return errors.throwError('burn non fungible token item require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            let transaction = this.signer.provider.getTransactionRequest("nonFungible", "burnNonFungibleItem", {
                symbol: this.symbol,
                itemID: this.itemID,
                from: address,
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
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "burn non fungible token item failed", {
                        method: "nonfungible-burnNonFungibleItem",
                        receipt
                    });
                });
            });
        });
    }
}