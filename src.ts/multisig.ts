'use strict';

import * as errors from './errors';
import { Provider, TransactionRequest, TransactionResponse, TransactionReceipt} from './providers/abstract-provider';
import { Signer } from './abstract-signer';


import { defineReadOnly, resolveProperties, checkProperties } from './utils/properties';
import { populateTransaction } from './utils/transaction';

import { checkFormat, checkString, checkNumber, checkAny } from './utils/misc';
import { BigNumberish, Arrayish, deriveAddress } from './utils';



export interface MultiSigWalletProperties {
    owner: string,
    threshold: Number,
    signers: string[],
}

export interface UpdateMultiSigWalletProperties {
    from: string,
    groupAddress: string,
    threshold: BigNumberish,
    signers: any,
}

export class MultiSigWallet extends Signer {

    readonly provider: Provider;
    readonly groupAddress: string;
    readonly signer: Signer;

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

    public sendTransaction(transaction: TransactionRequest, overrides?: any) {
        
        if (!this.signer) {
            errors.throwError('create multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            
            if (!signerAddress) {
                return errors.throwError('create multisig transaction', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.resolveName(this.groupAddress).then((groupAddress) => {
                let tx = this.provider.getTransactionRequest("multisig", "auth-createMutiSigTx", {
                    groupAddress,
                    tx: transaction,
                    sender: signerAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });

                return this.sendRawTransaction(tx, overrides);
            });
        });
    }

    public sendConfirmTransaction(transactionId: BigNumberish, overrides?: any) {
        if (!this.signer) {
            errors.throwError('confirm multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('create multisig transaction', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }

            return this.provider.resolveName(this.groupAddress).then((groupAddress) => {
                let tx = this.provider.getTransactionRequest("multisig", "auth-signMutiSigTx", {
                    groupAddress,
                    txId: transactionId,
                    sender: signerAddress,
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
    }

    private sendRawTransaction(transaction: TransactionRequest, overrides?: any) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }

        return populateTransaction(transaction, this.provider, this.address).then((tx) => {
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
     * @param signer signer wallet
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
                
                let groupAddress = deriveAddress(signerAddress, signer.getNonce());

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
     * @param signers signers
     */
    static update(properties: UpdateMultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('update multisig wallet transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }

        checkProperties(properties, {
            from: true,
            groupAddress: true,
            threshold: true,
            signers: true,
        }, true);

        return resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('update multisig wallet require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.from = address; // Set signer address as owner

            let multisig: UpdateMultiSigWalletProperties = checkFormat({
                from: checkString,
                groupAddress: checkString,
                threshold: checkNumber,
                signers: checkString,
            }, properties);

            let transaction = signer.provider.getTransactionRequest("multisig", "auth-updateMultiSigAccount", {
                from: multisig.from,
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