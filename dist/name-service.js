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
const base64_1 = require("./utils/base64");
const errors = __importStar(require("./errors"));
// Imported Abstracts
const abstract_signer_1 = require("./abstract-signer");
const formatAliasStatus = {
    alias: {
        name: misc_1.checkString,
        from: misc_1.checkAddress,
        nonce: misc_1.checkNumber,
        status: misc_1.checkString
    },
    pub_key: {
        type: misc_1.checkString,
        value: misc_1.checkString
    },
    signature: misc_1.checkString
};
const formatAliasStatusTransaction = {
    payload: function (value) {
        return misc_1.checkFormat(formatAliasStatus, value);
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
class Alias {
    /**
     * Sign alias status transaction by issuer
     * @param transaction alias status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signAliasStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('sign alias status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = misc_1.checkFormat(formatAliasStatusTransaction, transaction);
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
     * Send alias status transaction by middleware
     * @param transaction alias status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendAliasStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send alias status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            return errors.throwError('missing provider', errors.INVALID_ARGUMENT, { arg: 'signer', value: signer });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = misc_1.checkFormat(formatAliasStatusTransaction, transaction);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("nameservice", "nameservice-setAliasStatus", {
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
                    return errors.throwError("set alias status failed", errors.CALL_EXCEPTION, {
                        method: "nameservice/setAliasStatus",
                        response: response,
                        receipt: receipt
                    });
                });
            });
        });
    }
    /**
     * Approve alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static approveAlias(name, signer, overrides) {
        return setAliasStatus(name, "APPROVE", signer, overrides);
    }
    /**
     * Reject alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectAlias(name, signer, overrides) {
        return setAliasStatus(name, "REJECT", signer, overrides);
    }
    /**
     * Revoke alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static revokeAlias(name, signer, overrides) {
        return setAliasStatus(name, "REVOKE", signer, overrides);
    }
}
exports.Alias = Alias;
function setAliasStatus(name, status, signer, overrides) {
    if (!abstract_signer_1.Signer.isSigner(signer)) {
        errors.throwError('set alias status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!signer.provider) {
        return errors.throwError('missing provider', errors.INVALID_ARGUMENT, { arg: 'signer', value: signer });
    }
    if (!name) {
        errors.throwError('set alias status transaction require name', errors.MISSING_ARGUMENT, { arg: 'name' });
    }
    switch (status) {
        case "APPROVE":
        case "REJECT":
        case "REVOKE":
            break;
        default:
            errors.throwError('invalid alias status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
                    alias: {
                        from: signerAddress,
                        nonce: nonce.toString(),
                        status: status,
                        name: name
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64_1.encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            });
            return signer.signMessage(JSON.stringify(transaction.payload.alias), true).then((signature) => {
                transaction.payload.signature = base64_1.encode(signature);
                return transaction;
            });
        });
    });
}
//# sourceMappingURL=name-service.js.map