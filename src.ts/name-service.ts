'use strict';

import { resolveProperties, checkProperties } from './utils/properties';
import { sortObject, checkFormat, arrayOf, checkAddress, checkString, checkNumber, iterate } from './utils/misc';
import { encode as base64Encode } from './utils/base64';

import * as errors from './errors';

// Imported Abstracts
import { Signer } from './abstract-signer';

///////////////////////////////
// Imported Types

import { BigNumber } from './utils';
import { TransactionResponse, TransactionReceipt, TransactionRequest } from './providers';

export interface AliasStatus {
    alias: {
        name: string,
        from: string,
        nonce: BigNumber,
        status: string
    },
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

export interface AliasStatusTransaction {
    payload: AliasStatus,
    signatures: AliasSignature[]
}

export interface AliasSignature {
    pub_key: {
        type: string,
        value: string
    },
    signature: string
}

const formatAliasStatus = {
    alias: {
        name: checkString,
        from: checkAddress,
        nonce: checkNumber,
        status: checkString
    },
    pub_key: {
        type: checkString,
        value: checkString
    },
    signature: checkString
};

const formatAliasStatusTransaction = {
    payload: function (value: any) {
        return checkFormat(formatAliasStatus, value);
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

export class Alias {

    /**
     * Sign alias status transaction by issuer
     * @param transaction alias status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signAliasStatusTransaction(transaction: AliasStatusTransaction, signer: Signer, overrides?: any) {
        if (!Signer.isSigner(signer)) {
            errors.throwError('sign alias status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFormat(formatAliasStatusTransaction, transaction);

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
     * Send alias status transaction by middleware
     * @param transaction alias status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendAliasStatusTransaction(transaction: AliasStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        return this.getAliasStatusTransactionRequest(transaction, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;

                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set alias status failed", {
                        method: "nameservice/setAliasStatus",
                        receipt
                    });
                });
            });
        });
    }

    static getAliasStatusTransactionRequest(transaction: AliasStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionRequest> {
        if (!Signer.isSigner(signer)) {
            errors.throwError('send alias status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (!signer.provider) {
            return errors.throwError('missing provider', errors.INVALID_ARGUMENT, { arg: 'signer', value: signer });
        }
        checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFormat(formatAliasStatusTransaction, transaction);

        return resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("nameservice", "nameservice-setAliasStatus", {
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
     * Approve alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static approveAlias(name: string, signer: Signer, overrides?: any) {
        return setAliasStatus(name, "APPROVE", signer, overrides);
    }

    /**
     * Reject alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectAlias(name: string, signer: Signer, overrides?: any) {
        return setAliasStatus(name, "REJECT", signer, overrides);
    }

    /**
     * Revoke alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static revokeAlias(name: string, signer: Signer, overrides?: any) {
        return setAliasStatus(name, "REVOKE", signer, overrides);
    }

}

function setAliasStatus(name: string, status: string, signer: Signer, overrides?: any) {
    if (!Signer.isSigner(signer)) {
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
            let transaction: AliasStatusTransaction = sortObject({
                payload: {
                    alias: {
                        from: signerAddress,
                        nonce: nonce.toString(),
                        status: status,
                        name: name
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64Encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            });

            return signer.signMessage(JSON.stringify(transaction.payload.alias), true).then((signature) => {
                transaction.payload.signature = base64Encode(signature);
                return transaction;
            });
        });
    });
}
