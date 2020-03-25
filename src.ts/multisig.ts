'use strict';

import * as errors from './errors';
import { Provider, TransactionRequest, TransactionResponse, TransactionReceipt, BlockTag, AccountState, MultiSigPendingTx } from './providers/abstract-provider';
import { Signer } from './abstract-signer';

import { defineReadOnly, resolveProperties, checkProperties } from './utils/properties';
import { populateTransaction, parse as parseTransaction } from './utils/transaction';

import { checkFormat, checkString, checkNumber, checkAny, checkBigNumber } from './utils/misc';
import { BigNumberish, Arrayish, getMultiSigAddress, BigNumber } from './utils';

export interface MultiSigWalletProperties {
    owner: string,
    threshold: Number,
    signers: string[],
}

export interface UpdateMultiSigWalletProperties {
    owner: string,
    groupAddress: string,
    threshold: BigNumber,
    signers: any,
}

export class MultiSigWallet extends Signer {

    readonly provider: Provider;
    readonly groupAddress: string;
    readonly signer: Signer;

    private _multisigAccountState: AccountState;
    private accountNumber: BigNumber;

    constructor(groupAddress: string, signerOrProvider: Signer | Provider) {
        super();
        errors.checkNew(this, MultiSigWallet);
        if (!groupAddress) {
            errors.throwError('group address is required', errors.MISSING_ARGUMENT, { arg: 'group address' });
        }
        defineReadOnly(this, 'groupAddress', groupAddress);

        if (Signer.isSigner(signerOrProvider)) {
            defineReadOnly(this, 'provider', signerOrProvider.provider);
            defineReadOnly(this, 'signer', signerOrProvider);
        } else if (Provider.isProvider(signerOrProvider)) {
            defineReadOnly(this, 'provider', signerOrProvider);
            defineReadOnly(this, 'signer', null);
        } else {
            errors.throwError('invalid signer or provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
        }
    }

    public get multisigAccountState() {
        return this._multisigAccountState;
    }
    get address(): string { return this.groupAddress; }
    get hexAddress(): string { return ""; }

    get isUsable() {
        if (!this.groupAddress) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'groupAddress' });
        }
        return true;
    }

    public getAddress() {
        return Promise.resolve(this.address);
    }

    public getHexAddress() {
        return Promise.resolve(this.hexAddress);
    }

    public getPublicKeyType() {
        return Promise.reject(errors.createError(errors.NOT_IMPLEMENTED, "multisig wallet does not have public key", {}));
    }

    public getCompressedPublicKey() {
        return Promise.reject(errors.createError(errors.NOT_IMPLEMENTED, "multisig wallet does not have public key", {}));
    }

    public signMessage(message: Arrayish | string, excludeRecoveryParam?: boolean) {
        return Promise.reject(errors.createError(errors.NOT_IMPLEMENTED, "multisig wallet does not have private key for signing", {}));
    }

    public sign(transaction: TransactionRequest, overrides?: any) {
        if (!this.signer) {
            errors.throwError('sign multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return this.signer.sign(transaction, overrides);
    }

    private signInternalTransaction(transaction: TransactionRequest, overrides?: any) {
        if (!this.signer) {
            errors.throwError('sign multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        if (!this._multisigAccountState) {
            errors.throwError('multisig account state not found', errors.NOT_INITIALIZED, { arg: 'multisigAccountState' })
        }
        overrides = {
            ...overrides,
            accountNumber: this.multisigAccountState.value.accountNumber,
            nonce: this.multisigAccountState.value.multisig.counter
        }
        return this.signer.sign(transaction, overrides).then((signedTransaction) => {
            // Decode base64 signed transaction
            return parseTransaction(signedTransaction);
        });
    }

    public sendTransaction(transaction: TransactionRequest, overrides?: any) {
        if (!this.signer) {
            errors.throwError('create multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            return populateTransaction(transaction, this.provider, this.signer.getAddress()).then((internalTransaction) => {
                return this.signInternalTransaction(internalTransaction, overrides).then((signedInternalTransaction) => {
                    if (!signerAddress) {
                        return errors.throwError('create multisig transaction', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
                    }
                    return this.provider.resolveName(this.groupAddress).then((groupAddress) => {
                        if (signedInternalTransaction.hash) {
                            delete signedInternalTransaction.hash;
                        }
                        let tx = this.provider.getTransactionRequest("multisig", "auth-createMutiSigTx", {
                            groupAddress,
                            stdTx: signedInternalTransaction.value,
                            sender: signerAddress,
                            memo: (overrides && overrides.memo) ? overrides.memo : ""
                        });
                        tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
                        return this.sendRawTransaction(tx, overrides);
                    });
                });
            });
        });
    }

    public sendConfirmTransaction(transactionId: BigNumberish, overrides?: any) {
        if (!this.signer) {
            errors.throwError('confirm multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('confirm multisig transaction failed', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            return this.provider.resolveName(this.groupAddress).then((groupAddress) => {
                return this.getPendingTx(transactionId.toString(), null, overrides).then((pendingTx) => {
                    if (!pendingTx) {
                        return errors.throwError('confirm multisig transaction failed, pending tx not found', errors.MISSING_ARGUMENT, { arg: 'transactionId' });
                    }
                    return pendingTx;
                }).then((pendingTx) => {
                    return this.signInternalTransaction(pendingTx, overrides);
                }).then((signedPendingTx) => {
                    let tx = this.provider.getTransactionRequest("multisig", "auth-signMutiSigTx", {
                        groupAddress,
                        txId: transactionId,
                        sender: signerAddress,
                        signature: signedPendingTx.value.signatures,
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    });
                    tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

                    return this.sendRawTransaction(tx, overrides).then((response) => {
                        if (overrides && overrides.sendOnly) {
                            return response;
                        }
                        let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                        return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                            if (1 == receipt.status) {
                                return receipt;
                            }
                            throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "confirm multisig transaction failed", {
                                method: "auth-signMutiSigTx",
                                receipt
                            });
                        });
                    });

                });
            });
        });
    }

    private sendRawTransaction(transaction: TransactionRequest, overrides?: any) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }

        return populateTransaction(transaction, this.provider, this.signer.getAddress()).then((tx) => {
            // Removing multisig signature elements, so that it will be using wallet signature instead of multisig.
            if (overrides && overrides["accountNumber"]) {
                delete overrides["accountNumber"];
            }
            if (overrides && overrides["nonce"]) {
                delete overrides["nonce"];
            }
            return this.sign(tx, overrides).then((signedTransaction) => {
                return this.provider.sendTransaction(signedTransaction, overrides).catch(error => {
                    // Clear the cached nonce when failure happened to prevent it out of sequence
                    this.clearNonce();
                    throw error;
                });
            });
        });
    }

    /**
    * Create multisig wallet
    * @param properties multisig properties
    * @param signer signer wallet (owner of the group account)
    * @param overrides options
    */
    static create(properties: MultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | MultiSigWallet> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('create multisig wallet transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }

        checkProperties(properties, {
            owner: true,
            threshold: true,
            signers: true,
        }, true);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                errors.throwError('create multisig wallet require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.owner = signerAddress; // Set signer address as owner

            let multisig: MultiSigWalletProperties = checkFormat({
                owner: checkString,
                threshold: checkNumber,
                signers: checkAny,
            }, properties);

            let transaction = signer.provider.getTransactionRequest("multisig", "auth-createMultiSigAccount", {
                from: multisig.owner,
                threshold: multisig.threshold,
                signers: multisig.signers
            });
            transaction.fee = signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });

            return signer.sendTransaction(transaction, overrides).then((response) => {
                let groupAddress = getMultiSigAddress(signerAddress, signer.getNonce().add(1))

                console.log("groupAddress:", groupAddress);
                //console.log("getAddress:", (groupAddress));

                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return new MultiSigWallet(groupAddress, signer);
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create multisig wallet failed", {
                        method: "auth-createMultiSigAccount",
                        receipt
                    });
                });
            });
        });
    }

    /**
     * Update multiSig wallet
     * @param groupAddress group address
     * @param threshold number of threshold
     * @param signers signers (owner of the group account)
     */
    static update(properties: UpdateMultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('update multisig wallet transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }

        checkProperties(properties, {
            owner: true,
            groupAddress: true,
            threshold: true,
            signers: true,
        }, true);

        return resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('update multisig wallet require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.owner = address; // Set signer address as owner

            let multisig: UpdateMultiSigWalletProperties = checkFormat({
                owner: checkString,
                groupAddress: checkString,
                threshold: checkBigNumber,
                signers: checkAny,
            }, properties);

            let transaction = signer.provider.getTransactionRequest("multisig", "auth-updateMultiSigAccount", {
                owner: multisig.owner,
                groupAddress: multisig.groupAddress,
                threshold: multisig.threshold,
                signers: multisig.signers
            });
            transaction.fee = signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });
            return signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "update multisig wallet failed", {
                        method: "auth-updateMultiSigAccount",
                        receipt
                    });
                });
            });
        });
    }

    /**
     * Load MultiSigWallet instance by symbol
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromGroupAddress(groupAddress: string, signerOrProvider: Signer | Provider, overrides?: any) {
        let groupAcc = new MultiSigWallet(groupAddress, signerOrProvider);
        return groupAcc.refresh(overrides).then(() => {
            return groupAcc;
        });
    }

    /**
     * Query token account
     * @param blockTag reserved for future
     * @param overrides options
     */
    public getPendingTx(txID: string, blockTag?: BlockTag, overrides?: any): Promise<MultiSigPendingTx> {
        if (!this.signer) {
            errors.throwError('query multisig pending tx require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.groupAddress) {
            errors.throwError('query multisig pending tx group address', errors.MISSING_ARGUMENT, { arg: 'groupAddress' });
        }

        return this.provider.getMultiSigPendingTx(this.groupAddress, txID, blockTag).then((result) => {
            if (!result) {
                errors.throwError('Pending tx is not available', errors.NOT_AVAILABLE, { arg: 'groupAddress' });
            }
            return result;
        });
    }

    public refresh(overrides?: any) {
        if (!this.groupAddress) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        if (!this.provider) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'itemID' });
        }

        return this.getState(null, { ...overrides, queryOnly: true }).then((state) => {
            this._multisigAccountState = state;
            return this;
        });
    }

    public getState(blockTag?: BlockTag, overrides?: any) {
        if (!this.groupAddress) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        if (!this.provider) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'itemID' });
        }

        return this.provider.getAccountState(this.groupAddress, blockTag).then((result) => {
            if (!result) {
                errors.throwError('Group account state is not available', errors.NOT_AVAILABLE, { arg: 'groupAddress' });
            }
            if (this.groupAddress != result.value.address) {
                errors.throwError('Group account address mismatch', errors.UNEXPECTED_RESULT, { expected: this.groupAddress, returned: result });
            }
            if (!(overrides && overrides.queryOnly)) {
                this._multisigAccountState = result;
            }
            return result;
        });
    }

    public getBalance(blockTag?: BlockTag) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }
        return this.provider.getBalance(this.groupAddress, blockTag);
    }

    public getAccountNumber(blockTag?: BlockTag) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }

        if (!this.accountNumber) {
            return this.provider.getAccountNumber(this.address, blockTag).then((accountNumber) => {
                this.accountNumber = accountNumber;
                return Promise.resolve(this.accountNumber);
            });
        }
        return Promise.resolve(this.accountNumber);
    }

    public getNonce() {
        if (!this.signer) {
            errors.throwError('get nonce require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return this.signer.getNonce();
    }

    public clearNonce() {
        if (!this.signer) {
            errors.throwError('clear nonce require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.signer.clearNonce();
    }
}