'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors = __importStar(require("./errors"));
const abstract_provider_1 = require("./providers/abstract-provider");
const abstract_signer_1 = require("./abstract-signer");
const properties_1 = require("./utils/properties");
const transaction_1 = require("./utils/transaction");
const misc_1 = require("./utils/misc");
const utils_1 = require("./utils");
const units_1 = require("./utils/units");
class MultiSigWallet extends abstract_signer_1.Signer {
    constructor(groupAddress, signerOrProvider) {
        super();
        errors.checkNew(this, MultiSigWallet);
        if (!groupAddress) {
            errors.throwError('group address is required', errors.MISSING_ARGUMENT, { arg: 'group address' });
        }
        properties_1.defineReadOnly(this, 'groupAddress', groupAddress);
        if (abstract_signer_1.Signer.isSigner(signerOrProvider)) {
            properties_1.defineReadOnly(this, 'provider', signerOrProvider.provider);
            properties_1.defineReadOnly(this, 'signer', signerOrProvider);
        }
        else if (abstract_provider_1.Provider.isProvider(signerOrProvider)) {
            properties_1.defineReadOnly(this, 'provider', signerOrProvider);
            properties_1.defineReadOnly(this, 'signer', null);
        }
        else {
            errors.throwError('invalid signer or provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
        }
    }
    get multisigAccountState() {
        return this._multisigAccountState;
    }
    get address() { return this.groupAddress; }
    get hexAddress() { return ""; }
    get isUsable() {
        if (!this.groupAddress) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'groupAddress' });
        }
        return true;
    }
    getAddress() {
        return Promise.resolve(this.address);
    }
    getHexAddress() {
        return Promise.resolve(this.hexAddress);
    }
    getPublicKeyType() {
        return errors.throwError('multisig wallet does not have public key', errors.NOT_IMPLEMENTED, {});
    }
    getCompressedPublicKey() {
        return errors.throwError('multisig wallet does not have public key', errors.NOT_IMPLEMENTED, {});
    }
    sign(transaction, overrides) {
        return errors.throwError('multisig wallet does not have private key for signing', errors.NOT_IMPLEMENTED, {});
    }
    signMessage(message, excludeRecoveryParam) {
        return errors.throwError('multisig wallet does not have private key for signing', errors.NOT_IMPLEMENTED, {});
    }
    sendTransaction(transaction, overrides) {
        return errors.throwError('multisig wallet does not support send transaction', errors.NOT_IMPLEMENTED, {});
    }
    createTransaction(transaction, overrides) {
        return this.getCreateTransactionRequest(transaction, overrides).then((tx) => {
            return this.sendRawTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create multisig transaction failed", {
                        method: "auth-createMutiSigTx",
                        receipt,
                        response
                    });
                });
            });
        });
    }
    getCreateTransactionRequest(transaction, overrides) {
        if (!this.signer) {
            errors.throwError('create multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.provider) {
            errors.throwError("missing provider", errors.NOT_INITIALIZED, { arg: "provider" });
        }
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('create multisig transaction', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            return transaction_1.populateTransaction(transaction, this.provider, signerAddress).then((internalTransaction) => {
                return this.signInternalTransaction(internalTransaction, overrides).then((signedInternalTransaction) => {
                    if (signedInternalTransaction.hash) {
                        delete signedInternalTransaction.hash;
                    }
                    let tx = this.provider.getTransactionRequest("multisig", "auth-createMutiSigTx", {
                        groupAddress: this.groupAddress,
                        stdTx: signedInternalTransaction.value,
                        sender: signerAddress,
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    });
                    tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
                    return tx;
                });
            });
        });
    }
    confirmTransaction(transactionId, overrides) {
        return this.getConfirmTransactionRequest(transactionId, overrides).then((tx) => {
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
                        receipt,
                        response
                    });
                });
            });
        });
    }
    getConfirmTransactionRequest(transactionId, overrides) {
        if (!this.signer) {
            errors.throwError('confirm multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.provider) {
            errors.throwError("missing provider", errors.NOT_INITIALIZED, { arg: "provider" });
        }
        return this.getPendingTransactionRequest(transactionId, overrides).then((pendingTx) => {
            return transaction_1.populateTransaction(pendingTx, this.provider, this.signer.getAddress()).then((internalPendingTransaction) => {
                return this.signInternalTransaction(internalPendingTransaction, overrides);
            }).then((signedPendingTx) => {
                return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
                    let tx = this.provider.getTransactionRequest("multisig", "auth-signMutiSigTx", {
                        groupAddress: this.groupAddress,
                        txId: transactionId,
                        sender: signerAddress,
                        // there is always signed by one signer for pendingTx so take the first one.
                        signature: signedPendingTx.value.signatures[0],
                        memo: (overrides && overrides.memo) ? overrides.memo : ""
                    });
                    tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
                    return tx;
                });
            });
        });
    }
    getPendingTransactionRequest(transactionId, overrides) {
        return this.getPendingTx(transactionId.toString(), null, overrides).then((pendingTx) => {
            if (!pendingTx) {
                return errors.throwError('confirm multisig transaction failed, pending tx not found', errors.MISSING_ARGUMENT, { arg: 'transactionId' });
            }
            return pendingTx;
        }).then((pendingTx) => {
            // delete the returned signatures, we don need those to be include in signing payload.
            delete pendingTx.value.signatures;
            let tx = {
                type: pendingTx.type,
                value: {
                    msg: pendingTx.value.msg,
                    memo: pendingTx.value.memo
                },
                fee: pendingTx.value.fee,
                accountNumber: this.multisigAccountState.value.accountNumber
            };
            // signing pending tx the counter(nonce) will be transactionId.
            overrides = Object.assign(Object.assign({}, overrides), { nonce: transactionId.toString() });
            return tx;
        });
    }
    signInternalTransaction(transaction, overrides) {
        if (!this.signer) {
            errors.throwError('sign multisig transaction require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this._multisigAccountState) {
            errors.throwError('multisig account state not found', errors.NOT_INITIALIZED, { arg: 'multisigAccountState' });
        }
        let override = Object.assign(Object.assign({}, overrides), { accountNumber: this.multisigAccountState.value.accountNumber, 
            // cater for send confirm transaction, the counter will be using txId.
            nonce: (overrides && !misc_1.isUndefinedOrNullOrEmpty(overrides.nonce)) ? utils_1.bigNumberify(overrides.nonce) : this.multisigAccountState.value.multisig.counter });
        return this.signer.sign(transaction, override).then((signedTransaction) => {
            // Decode base64 signed transaction
            return transaction_1.parse(signedTransaction);
        });
    }
    sendRawTransaction(transaction, overrides) {
        // Removing multisig signature elements, so that it will be using wallet signature instead of multisig.
        if (overrides && overrides["accountNumber"]) {
            delete overrides["accountNumber"];
        }
        if (overrides && overrides["nonce"]) {
            delete overrides["nonce"];
        }
        return this.signer.sign(transaction, overrides).then((signedTransaction) => {
            return this.provider.sendTransaction(signedTransaction, overrides).catch(error => {
                // Clear the cached nonce when failure happened to prevent it out of sequence
                this.clearNonce();
                throw error;
            });
        });
    }
    /**
    * Create multisig wallet
    * @param properties multisig properties
    * @param signer signer wallet (owner of the group account)
    * @param overrides options
    */
    static create(properties, signer, overrides) {
        return this.getCreateTransactionRequest(properties, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
                            let groupAddress = utils_1.getMultiSigAddress(signerAddress, signer.getNonce().add(1));
                            return new MultiSigWallet(groupAddress, signer);
                        });
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create multisig wallet failed", {
                        method: "auth-createMultiSigAccount",
                        receipt
                    });
                });
            });
        });
    }
    static getCreateTransactionRequest(properties, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('create multisig wallet transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }
        properties_1.checkProperties(properties, {
            threshold: true,
            signers: true,
        }, true);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                errors.throwError('create multisig wallet require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            let multisig = misc_1.checkFormat({
                threshold: misc_1.checkNumber,
                signers: misc_1.checkAny,
            }, properties);
            let tx = signer.provider.getTransactionRequest("multisig", "auth-createMultiSigAccount", {
                from: signerAddress,
                threshold: multisig.threshold,
                signers: multisig.signers,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : signer.provider.getTransactionFee(undefined, undefined, { tx });
            return tx;
        });
    }
    static update(properties, signer, overrides) {
        return this.getUpdateTransactionRequest(properties, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
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
    static getUpdateTransactionRequest(properties, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('update multisig wallet transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }
        properties_1.checkProperties(properties, {
            owner: true,
            groupAddress: true,
            threshold: true,
            signers: true,
        }, true);
        return properties_1.resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('update multisig wallet require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.owner = address; // Set signer address as owner
            let multisig = misc_1.checkFormat({
                owner: misc_1.checkString,
                groupAddress: misc_1.checkString,
                threshold: misc_1.checkBigNumber,
                signers: misc_1.checkAny,
            }, properties);
            let tx = signer.provider.getTransactionRequest("multisig", "auth-updateMultiSigAccount", {
                owner: multisig.owner,
                groupAddress: multisig.groupAddress,
                threshold: multisig.threshold,
                signers: multisig.signers,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : signer.provider.getTransactionFee(undefined, undefined, { tx });
            return tx;
        });
    }
    /**
     * Load MultiSigWallet instance by address
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromGroupAddress(groupAddress, signerOrProvider, overrides) {
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
    getPendingTx(txID, blockTag, overrides) {
        if (!this.provider) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'itemID' });
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
    refresh(overrides) {
        return this.getState(null, Object.assign(Object.assign({}, overrides), { queryOnly: true })).then((state) => {
            this._multisigAccountState = state;
            return this;
        });
    }
    getState(blockTag, overrides) {
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
    getBalance(blockTag) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        return this.provider.getBalance(this.groupAddress, blockTag);
    }
    getAccountNumber(blockTag) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        if (!this.accountNumber) {
            return this.provider.getAccountNumber(this.address, blockTag).then((accountNumber) => {
                this.accountNumber = accountNumber;
                return Promise.resolve(this.accountNumber);
            });
        }
        return Promise.resolve(this.accountNumber);
    }
    transfer(addressOrName, value, overrides) {
        return this.getTransferTransactionRequest(addressOrName, value, overrides).then((tx) => {
            return this.createTransaction(tx, overrides);
        });
    }
    getTransferTransactionRequest(addressOrName, value, overrides) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        if (addressOrName instanceof Promise) {
            return addressOrName.then((address) => {
                return this.getTransferTransactionRequest(address, value, overrides);
            });
        }
        return this.provider.resolveName(addressOrName).then((address) => {
            let tx = this.provider.getTransactionRequest("bank", "bank-send", {
                from: this.address,
                to: address,
                value: value,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                denom: (overrides && overrides.denom) ? overrides.denom : units_1.smallestUnitName
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
            return tx;
        });
    }
    getNonce() {
        if (!this.signer) {
            errors.throwError('get nonce require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return this.signer.getNonce();
    }
    clearNonce() {
        if (!this.signer) {
            errors.throwError('clear nonce require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.signer.clearNonce();
    }
}
exports.MultiSigWallet = MultiSigWallet;
//# sourceMappingURL=multisig.js.map