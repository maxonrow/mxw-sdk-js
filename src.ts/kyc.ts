'use strict';

import { defineReadOnly, resolveProperties, checkProperties } from './utils/properties';
import { sortObject, checkFormat, arrayOf, checkAddress, checkString, checkNumber, checkBigNumber, iterate, checkHash } from './utils/misc';
import { sha256 } from './utils/sha2';
import { encode as base64Encode } from './utils/base64';

import * as errors from './errors';

// Imported Abstracts
import { Provider, TransactionRequest } from './providers/abstract-provider';
import { Signer } from './abstract-signer';

///////////////////////////////
// Imported Types

import { TransactionReceipt, TransactionResponse } from './providers/abstract-provider';
import { BigNumber, toUtf8Bytes, computeAddress } from './utils';
import { KycAddressPrefix } from './constants';

export interface KycKeyComponent {
    country: string,
    idType: string,
    id: string,
    idExpiry: number,
    dob: number,
    seed: string
}

const formatKycKeyComponent = {
    country: checkString,
    idType: checkString,
    id: checkString,
    idExpiry: checkNumber,
    dob: checkNumber,
    seed: checkHash
}

export interface KycData {
    kyc: {
        from: string,
        nonce: BigNumber,
        kycAddress: string
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

const formatKycData = {
    kyc: {
        from: checkAddress,
        nonce: checkBigNumber,
        kycAddress: checkString
    },
    pub_key: {
        type: checkString,
        value: checkString
    },
    signature: checkString
};

export interface KycTransaction {
    payload: KycData,
    signatures: KycSignature[]
}

const formatKycTransaction = {
    payload: function (value: any) {
        return checkFormat(formatKycData, value);
    },
    signatures: arrayOf(function (value: any) {
        return checkFormat({
            pub_key: {
                type: checkString,
                value: checkString
            },
            signature: checkString
        }, value);
    })
};

export interface KycSignature {
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export interface KycRevoke {
    kyc: {
        from: string,
        to: string,
        nonce: BigNumber
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

const formatKycRevoke = {
    kyc: {
        from: checkAddress,
        to: checkAddress,
        nonce: checkBigNumber
    },
    pub_key: {
        type: checkString,
        value: checkString
    },
    signature: checkString
};

export interface KycRevokeTransaction {
    payload: KycRevoke,
    signatures: KycSignature[]
}

const formatKycRevokeTransaction = {
    payload: function (value: any) {
        return checkFormat(formatKycRevoke, value);
    },
    signatures: arrayOf(function (value: any) {
        return checkFormat({
            pub_key: {
                type: checkString,
                value: checkString
            },
            signature: checkString
        }, value);
    })
};

export class Kyc {

    readonly signer: Signer;
    readonly provider: Provider;

    constructor(signerOrProvider: Signer | Provider) {
        errors.checkNew(this, Kyc);

        if (Signer.isSigner(signerOrProvider)) {
            defineReadOnly(this, 'provider', signerOrProvider.provider);
            defineReadOnly(this, 'signer', signerOrProvider);
        } else if (Provider.isProvider(signerOrProvider)) {
            defineReadOnly(this, 'provider', signerOrProvider);
            defineReadOnly(this, 'signer', null);
        } else {
            return errors.throwError('invalid signer or provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
        }
    }

    approve(transaction?: KycTransaction, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.whitelist(transaction, overrides);
    }

    /**
     * Middleware to whitelist wallet (DEPRECIATE SOON)
     * @param transaction transaction object
     * @param overrides options
     */
    whitelist(transaction: KycTransaction, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getWhitelistTransactionRequest(transaction, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return this.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("kyc whitelist failed", errors.CALL_EXCEPTION, {
                        method: "kyc/whitelist",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    getWhitelistTransactionRequest(transaction: KycTransaction, overrides?: any): Promise<TransactionRequest> {
        if (!this.signer) {
            errors.throwError('kyc require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.provider) {
            errors.throwError("missing provider", errors.NOT_INITIALIZED, { arg: "provider" });
        }

        checkProperties(transaction, { payload: true, signatures: true });
        checkFormat(formatKycTransaction, transaction);

        return resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            let tx = this.provider.getTransactionRequest("kyc", "kyc-whitelist", {
                kycData: transaction,
                owner: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
            });
            tx.fee = this.provider.getTransactionFee(undefined, undefined, { tx });

            return tx;
        });
    }

    /**
     * Generate kyc address by hashing the key components
     * @param keyComponent key component to form the kyc address
     * @param issuerAddress issuer address
     * @returns kyc address
     */
    getKycAddress(keyComponent: KycKeyComponent) {
        if (!keyComponent) {
            errors.throwError("missing key component", errors.MISSING_ARGUMENT, { arg: "keyComponent" });
        }

        checkProperties(keyComponent, { country: true, idType: true, id: true, idExpiry: true, dob: true, seed: true });
        keyComponent = checkFormat(formatKycKeyComponent, keyComponent);

        // Hash the KYC components to become KYC address
        let hash = sha256(toUtf8Bytes(JSON.stringify(sortObject(keyComponent))));
        return computeAddress(hash, KycAddressPrefix);
    }

    /**
     * Wallet to sign kyc address
     * @param keyComponentOrAddress key components to form kyc address or formed kyc address
     * @param overrides options
     * @todo issuerAddress parameter will going to mandate in next release
     */
    sign(keyComponentOrAddress: KycKeyComponent | string, overrides?: any): Promise<KycData> {
        if (!this.signer) {
            errors.throwError('kyc require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.provider) {
            errors.throwError('kyc require provider', errors.NOT_INITIALIZED, { arg: 'provider' });
        }

        if ("string" !== typeof keyComponentOrAddress) {
            return this.sign(this.getKycAddress(keyComponentOrAddress), overrides);
        }

        return resolveProperties({
            signerAddress: this.signer.getAddress(),
            publicKeyType: this.signer.getPublicKeyType(),
            compressedPublicKey: this.signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            let nonce = overrides ? overrides.nonce : undefined;
            if (!nonce) {
                nonce = this.provider.getTransactionCount(signerAddress, "pending");
            }

            return resolveProperties({ nonce: nonce }).then(({ nonce }) => {
                let kycData: KycData = sortObject({
                    kyc: {
                        from: signerAddress,
                        kycAddress: keyComponentOrAddress,
                        nonce: nonce.toString()
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: ""
                });

                return this.signer.signMessage(JSON.stringify(kycData.kyc), true).then((signature) => {
                    kycData.signature = base64Encode(signature);
                    return kycData;
                });
            });
        });
    }

    /**
     * Issuer to sign transaction
     * @param transaction transaction object
     * @param overrides options
     */
    signTransaction(transaction: KycTransaction, overrides?: any): Promise<KycTransaction> {
        if (!this.signer) {
            errors.throwError('sign kyc require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        checkFormat(formatKycTransaction, transaction);

        return resolveProperties({
            signerAddress: this.signer.getAddress(),
            publicKeyType: this.signer.getPublicKeyType(),
            compressedPublicKey: this.signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            transaction = sortObject(transaction);

            return this.signer.signMessage(JSON.stringify(transaction.payload), true).then((signature) => {
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
     *  Static methods to create kyc instances.
     */
    static create(signerOrProvider?: Signer | Provider): Promise<Kyc> {
        return new Promise<Kyc>((resolve, reject) => {
            let kyc = new Kyc(signerOrProvider);
            return resolve(kyc);
        });
    }

    /**
     * Revoke kyc whitelist by provider
     * @param address wallet address
     * @param signer signer wallet
     * @param overrides options
     */
    static revoke(address: string, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('create revocation transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('create revocation transaction require provider', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!address) {
            errors.throwError('create revocation transaction require address', errors.MISSING_ARGUMENT, { arg: 'address' });
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
                let transaction: KycRevokeTransaction = sortObject({
                    payload: {
                        kyc: {
                            from: signerAddress,
                            to: address,
                            nonce: nonce.toString()
                        },
                        pub_key: {
                            type: "tendermint/" + publicKeyType,
                            value: base64Encode(compressedPublicKey)
                        },
                        signature: ""
                    },
                    signatures: []
                });

                return signer.signMessage(JSON.stringify(transaction.payload.kyc), true).then((signature) => {
                    transaction.payload.signature = base64Encode(signature);
                    return transaction;
                });
            });
        });
    }

    /**
     * Sign revocation transaction by issuer
     * @param transaction revocation transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signRevokeTransaction(transaction: KycRevokeTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('sign revocation transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFormat(formatKycRevokeTransaction, transaction);

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
     * Send revocation transaction by middleware
     * @param transaction revocation transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendRevokeTransaction(transaction: KycRevokeTransaction, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getRevokeTransactionRequest(transaction, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("set kyc revocation failed", errors.CALL_EXCEPTION, {
                        method: "kyc/revokeWhitelist",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    static getRevokeTransactionRequest(transaction: KycRevokeTransaction, signer: Signer, overrides?: any): Promise<TransactionRequest> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('send revocation transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('send revocation transaction require provider', errors.MISSING_ARGUMENT, { arg: 'provider' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFormat(formatKycRevokeTransaction, transaction);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("kyc", "kyc-revokeWhitelist", {
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
     * Create relationship between wallets
     */
    static bind(addressOrName: string | Promise<string>, kycAddress: string, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getBindTransactionRequest(addressOrName, kycAddress, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("kyc bind failed", errors.CALL_EXCEPTION, {
                        method: "kyc/bind",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    static getBindTransactionRequest(addressOrName: string | Promise<string>, kycAddress: string, signer: Signer, overrides?: any): Promise<TransactionRequest> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('kyc bind transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('kyc bind transaction require provider', errors.MISSING_ARGUMENT, { arg: 'provider' });
        }

        if (addressOrName instanceof Promise) {
            return addressOrName.then((address) => {
                return this.getBindTransactionRequest(address, kycAddress, signer, overrides);
            });
        }

        let params: {
            kycAddress: string
        } = checkFormat({
            kycAddress: checkString
        }, { kycAddress });

        return signer.provider.resolveName(addressOrName).then((address) => {
            return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
                let tx = signer.provider.getTransactionRequest("kyc", "kyc-bind", {
                    from: signerAddress,
                    to: address,
                    kycAddress: params.kycAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : "",
                });
                tx.fee = signer.provider.getTransactionFee(undefined, undefined, { tx });

                return tx;
            });
        });
    }

    /**
     * Remove relationship between wallets
     */
    static unbind(addressOrName: string | Promise<string>, kycAddress: string, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getUnbindTransactionRequest(addressOrName, kycAddress, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    return errors.throwError("kyc unbind failed", errors.CALL_EXCEPTION, {
                        method: "kyc/unbind",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }

    static getUnbindTransactionRequest(addressOrName: string | Promise<string>, kycAddress: string, signer: Signer, overrides?: any): Promise<TransactionRequest> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('kyc unbind transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('kyc unbind transaction require provider', errors.MISSING_ARGUMENT, { arg: 'provider' });
        }

        if (addressOrName instanceof Promise) {
            return addressOrName.then((address) => {
                return this.getUnbindTransactionRequest(address, kycAddress, signer, overrides);
            });
        }

        let params: {
            kycAddress: string
        } = checkFormat({
            kycAddress: checkString
        }, { kycAddress });

        return signer.provider.resolveName(addressOrName).then((address) => {
            return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
                let tx = signer.provider.getTransactionRequest("kyc", "kyc-unbind", {
                    from: signerAddress,
                    to: address,
                    kycAddress: params.kycAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : "",
                });
                tx.fee = signer.provider.getTransactionFee(undefined, undefined, { tx });

                return tx;
            });
        });
    }
}
