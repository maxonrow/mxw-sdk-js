'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const properties_1 = require("./utils/properties");
const misc_1 = require("./utils/misc");
const sha2_1 = require("./utils/sha2");
const base64_1 = require("./utils/base64");
const errors = __importStar(require("./errors"));
// Imported Abstracts
const abstract_provider_1 = require("./providers/abstract-provider");
const abstract_signer_1 = require("./abstract-signer");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const formatKycKeyComponent = {
    country: misc_1.checkString,
    idType: misc_1.checkString,
    id: misc_1.checkString,
    idExpiry: misc_1.checkNumber,
    dob: misc_1.checkNumber,
    seed: misc_1.checkHash
};
const formatKycData = {
    kyc: {
        from: misc_1.checkAddress,
        nonce: misc_1.checkBigNumber,
        kycAddress: misc_1.checkString
    },
    pub_key: {
        type: misc_1.checkString,
        value: misc_1.checkString
    },
    signature: misc_1.checkString
};
const formatKycTransaction = {
    payload: function (value) {
        return misc_1.checkFormat(formatKycData, value);
    },
    signatures: misc_1.arrayOf(function (value) {
        return misc_1.checkFormat({
            pub_key: {
                type: misc_1.checkString,
                value: misc_1.checkString
            },
            signature: misc_1.checkString
        }, value);
    })
};
const formatKycRevoke = {
    kyc: {
        from: misc_1.checkAddress,
        to: misc_1.checkAddress,
        nonce: misc_1.checkBigNumber
    },
    pub_key: {
        type: misc_1.checkString,
        value: misc_1.checkString
    },
    signature: misc_1.checkString
};
const formatKycRevokeTransaction = {
    payload: function (value) {
        return misc_1.checkFormat(formatKycRevoke, value);
    },
    signatures: misc_1.arrayOf(function (value) {
        return misc_1.checkFormat({
            pub_key: {
                type: misc_1.checkString,
                value: misc_1.checkString
            },
            signature: misc_1.checkString
        }, value);
    })
};
class Kyc {
    constructor(signerOrProvider) {
        errors.checkNew(this, Kyc);
        if (abstract_signer_1.Signer.isSigner(signerOrProvider)) {
            properties_1.defineReadOnly(this, 'provider', signerOrProvider.provider);
            properties_1.defineReadOnly(this, 'signer', signerOrProvider);
        }
        else if (abstract_provider_1.Provider.isProvider(signerOrProvider)) {
            properties_1.defineReadOnly(this, 'provider', signerOrProvider);
            properties_1.defineReadOnly(this, 'signer', null);
        }
        else {
            return errors.throwError('invalid signer or provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
        }
    }
    approve(transaction, overrides) {
        return this.whitelist(transaction, overrides);
    }
    /**
     * Middleware to whitelist wallet (DEPRECIATE SOON)
     * @param transaction transaction object
     * @param overrides options
     */
    whitelist(transaction, overrides) {
        if (!this.signer) {
            errors.throwError('kyc require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.provider) {
            errors.throwError("missing provider", errors.NOT_INITIALIZED, { arg: "provider" });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        misc_1.checkFormat(formatKycTransaction, transaction);
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            let tx = this.provider.getTransactionRequest("kyc", "kyc-whitelist", {
                kycData: transaction,
                owner: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
            });
            tx.fee = this.provider.getTransactionFee(undefined, undefined, { tx });
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
    /**
     * Generate kyc address by hashing the key components
     * @param keyComponent key component to form the kyc address
     * @param issuerAddress issuer address
     * @returns kyc address
     */
    getKycAddress(keyComponent) {
        if (!keyComponent) {
            errors.throwError("missing key component", errors.MISSING_ARGUMENT, { arg: "keyComponent" });
        }
        properties_1.checkProperties(keyComponent, { country: true, idType: true, id: true, idExpiry: true, dob: true, seed: true });
        keyComponent = misc_1.checkFormat(formatKycKeyComponent, keyComponent);
        // Hash the KYC components to become KYC address
        let hash = sha2_1.sha256(utils_1.toUtf8Bytes(JSON.stringify(misc_1.sortObject(keyComponent))));
        return utils_1.computeAddress(hash, constants_1.KycAddressPrefix);
    }
    /**
     * Wallet to sign kyc address
     * @param keyComponentOrAddress key components to form kyc address or formed kyc address
     * @param overrides options
     * @todo issuerAddress parameter will going to mandate in next release
     */
    sign(keyComponentOrAddress, overrides) {
        if (!this.signer) {
            errors.throwError('kyc require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.provider) {
            errors.throwError('kyc require provider', errors.NOT_INITIALIZED, { arg: 'provider' });
        }
        if ("string" !== typeof keyComponentOrAddress) {
            return this.sign(this.getKycAddress(keyComponentOrAddress), overrides);
        }
        return properties_1.resolveProperties({
            signerAddress: this.signer.getAddress(),
            publicKeyType: this.signer.getPublicKeyType(),
            compressedPublicKey: this.signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            let nonce = overrides ? overrides.nonce : undefined;
            if (!nonce) {
                nonce = this.provider.getTransactionCount(signerAddress, "pending");
            }
            return properties_1.resolveProperties({ nonce: nonce }).then(({ nonce }) => {
                let kycData = misc_1.sortObject({
                    kyc: {
                        from: signerAddress,
                        kycAddress: keyComponentOrAddress,
                        nonce: nonce.toString()
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64_1.encode(compressedPublicKey)
                    },
                    signature: ""
                });
                return this.signer.signMessage(JSON.stringify(kycData.kyc), true).then((signature) => {
                    kycData.signature = base64_1.encode(signature);
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
    signTransaction(transaction, overrides) {
        if (!this.signer) {
            errors.throwError('sign kyc require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        misc_1.checkFormat(formatKycTransaction, transaction);
        return properties_1.resolveProperties({
            signerAddress: this.signer.getAddress(),
            publicKeyType: this.signer.getPublicKeyType(),
            compressedPublicKey: this.signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            transaction = misc_1.sortObject(transaction);
            return this.signer.signMessage(JSON.stringify(transaction.payload), true).then((signature) => {
                transaction.signatures.push({
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64_1.encode(compressedPublicKey)
                    },
                    signature: base64_1.encode(signature)
                });
                return transaction;
            });
        });
    }
    /**
     *  Static methods to create kyc instances.
     */
    static create(signerOrProvider) {
        return new Promise((resolve, reject) => {
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
    static revoke(address, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('create revocation transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('create revocation transaction require provider', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!address) {
            errors.throwError('create revocation transaction require address', errors.MISSING_ARGUMENT, { arg: 'address' });
        }
        return properties_1.resolveProperties({
            signerAddress: signer.getAddress(),
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            let nonce = overrides ? overrides.nonce : undefined;
            if (!nonce) {
                nonce = signer.provider.getTransactionCount(signerAddress, "pending");
            }
            return properties_1.resolveProperties({ nonce: nonce }).then(({ nonce }) => {
                let transaction = misc_1.sortObject({
                    payload: {
                        kyc: {
                            from: signerAddress,
                            to: address,
                            nonce: nonce.toString()
                        },
                        pub_key: {
                            type: "tendermint/" + publicKeyType,
                            value: base64_1.encode(compressedPublicKey)
                        },
                        signature: ""
                    },
                    signatures: []
                });
                return signer.signMessage(JSON.stringify(transaction.payload.kyc), true).then((signature) => {
                    transaction.payload.signature = base64_1.encode(signature);
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
    static signRevokeTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('sign revocation transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = misc_1.checkFormat(formatKycRevokeTransaction, transaction);
        return properties_1.resolveProperties({
            signerAddress: signer.getAddress(),
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ signerAddress, publicKeyType, compressedPublicKey }) => {
            // Convert number and big number to string
            transaction = misc_1.iterate(transaction, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            transaction = misc_1.sortObject(transaction);
            return signer.signMessage(JSON.stringify(transaction.payload), true).then((signature) => {
                transaction.signatures.push({
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64_1.encode(compressedPublicKey)
                    },
                    signature: base64_1.encode(signature)
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
    static sendRevokeTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send revocation transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('send revocation transaction require provider', errors.MISSING_ARGUMENT, { arg: 'provider' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = misc_1.checkFormat(formatKycRevokeTransaction, transaction);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("kyc", "kyc-revokeWhitelist", {
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
                    return errors.throwError("set kyc revocation failed", errors.CALL_EXCEPTION, {
                        method: "kyc/revokeWhitelist",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }
    /**
     * Create relationship between wallets
     * @param transaction transaction object
     * @param overrides options
     */
    static bind(to, kycAddress, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send kyc bind transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('send kyc bind transaction require provider', errors.MISSING_ARGUMENT, { arg: 'provider' });
        }
        let params = misc_1.checkFormat({
            to: misc_1.checkString,
            kycAddress: misc_1.checkString
        }, { to, kycAddress });
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("kyc", "kyc-bind", {
                from: signerAddress,
                to: params.to,
                kycAddress: params.kycAddress,
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
                    return errors.throwError("kyc bind failed", errors.CALL_EXCEPTION, {
                        method: "kyc/bind",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }
    /**
     * Remove relationship between wallets
     * @param transaction transaction object
     * @param overrides options
     */
    static unbind(to, kycAddress, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send kyc unbind transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            errors.throwError('send kyc unbind transaction require provider', errors.MISSING_ARGUMENT, { arg: 'provider' });
        }
        let params = misc_1.checkFormat({
            to: misc_1.checkString,
            kycAddress: misc_1.checkString
        }, { to, kycAddress });
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("kyc", "kyc-unbind", {
                from: signerAddress,
                to: params.to,
                kycAddress: params.kycAddress,
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
                    return errors.throwError("kyc unbind failed", errors.CALL_EXCEPTION, {
                        method: "kyc/unbind",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }
}
exports.Kyc = Kyc;
//# sourceMappingURL=kyc.js.map