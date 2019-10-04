'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bytes_1 = require("./utils/bytes");
const hash_1 = require("./utils/hash");
const hdnode_1 = require("./utils/hdnode");
const json_wallet_1 = require("./utils/json-wallet");
const properties_1 = require("./utils/properties");
const random_bytes_1 = require("./utils/random-bytes");
const secretStorage = __importStar(require("./utils/secret-storage"));
const signing_key_1 = require("./utils/signing-key");
const transaction_1 = require("./utils/transaction");
const sha2_1 = require("./utils/sha2");
const misc_1 = require("./utils/misc");
const utils_1 = require("./utils");
const units_1 = require("./utils/units");
// Imported Abstracts
const abstract_signer_1 = require("./abstract-signer");
const abstract_provider_1 = require("./providers/abstract-provider");
const errors = __importStar(require("./errors"));
class Wallet extends abstract_signer_1.Signer {
    constructor(privateKey, provider) {
        super();
        errors.checkNew(this, Wallet);
        // Make sure we have a valid signing key
        if (signing_key_1.SigningKey.isSigningKey(privateKey)) {
            properties_1.defineReadOnly(this, 'signingKey', privateKey);
        }
        else {
            properties_1.defineReadOnly(this, 'signingKey', new signing_key_1.SigningKey(privateKey));
        }
        properties_1.defineReadOnly(this, 'provider', provider);
    }
    get address() { return this.signingKey.address; }
    get hexAddress() { return this.signingKey.hexAddress; }
    get mnemonic() { return this.signingKey.mnemonic; }
    get wordlist() { return this.signingKey.wordlist; }
    get path() { return this.signingKey.path; }
    get privateKey() { return this.signingKey.privateKey; }
    get publicKey() { return this.signingKey.compressedPublicKey; }
    get publicKeyType() { return this.signingKey.publicKeyType; }
    get compressedPublicKey() { return this.signingKey.compressedPublicKey; }
    get extendedPublicKey() { return this.signingKey.publicKey; }
    computeSharedSecret(otherPublicKey) {
        return this.signingKey.computeSharedSecret(otherPublicKey);
    }
    /**
     *  Create a new instance of this Wallet connected to provider.
     */
    connect(provider) {
        if (!(abstract_provider_1.Provider.isProvider(provider))) {
            errors.throwError('invalid provider', errors.INVALID_ARGUMENT, { argument: 'provider', value: provider });
        }
        return new Wallet(this.signingKey, provider);
    }
    getAddress() {
        return Promise.resolve(this.address);
    }
    getAlias() {
        return this.provider.lookupAddress(this.address);
    }
    // Should be depreciate soon
    getPendingAlias() {
        return this.provider.getAliasState(this.address);
    }
    getAliasState() {
        return this.provider.getAliasState(this.address);
    }
    getHexAddress() {
        return Promise.resolve(this.hexAddress);
    }
    getPublicKeyType() {
        return Promise.resolve(this.publicKeyType);
    }
    getCompressedPublicKey() {
        return Promise.resolve(this.compressedPublicKey);
    }
    clearNonce() {
        this.nonce = undefined;
    }
    sendTransaction(transaction, overrides) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        return transaction_1.populateTransaction(transaction, this.provider, this.address).then((tx) => {
            return this.sign(tx, overrides).then((signedTransaction) => {
                return this.provider.sendTransaction(signedTransaction, overrides).catch(error => {
                    // Clear the cached nonce when failure happened to prevent it out of sequence
                    this.clearNonce();
                    throw error;
                });
            });
        });
    }
    sign(transaction, overrides) {
        if (transaction.nonce == null || transaction.accountNumber == null) {
            transaction = properties_1.shallowCopy(transaction);
            if (transaction.nonce == null) {
                transaction.nonce = this.getTransactionCount("pending");
            }
            if (transaction.accountNumber == null) {
                transaction.accountNumber = this.getAccountNumber();
            }
        }
        return properties_1.resolveProperties(transaction).then((tx) => {
            if (!tx.nonce || !tx.accountNumber || !tx.value || !tx.value.msg || !Array.isArray(tx.value.msg)) {
                errors.throwError('missing transaction field', errors.MISSING_ARGUMENT, { argument: 'value', value: tx });
            }
            if (!Array.isArray(tx.value.msg)) {
                errors.throwError('invalid transaction field', errors.MISSING_ARGUMENT, { argument: 'value', value: tx });
            }
            if (!tx.value.fee) {
                tx.value.fee = transaction.fee;
            }
            let payload = {
                account_number: tx.accountNumber.toString() || '0',
                chain_id: tx.chainId,
                fee: tx.fee,
                memo: tx.value.memo,
                msgs: tx.value.msg,
                sequence: '0'
            };
            // Control the nonce to cater bulk transaction submission
            if (overrides && overrides.bulkSend) {
                if (undefined !== this.nonce) {
                    if (this.nonce.gte(tx.nonce)) {
                        tx.nonce = this.nonce.add(1);
                    }
                }
            }
            this.nonce = tx.nonce;
            payload.sequence = tx.nonce.toString();
            // Convert number and big number to string
            payload = misc_1.iterate(payload, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            payload = misc_1.sortObject(payload);
            // Log signature payload
            if (overrides && overrides.logSignaturePayload) {
                overrides.logSignaturePayload(payload);
            }
            let bytes = utils_1.toUtf8Bytes(JSON.stringify(payload));
            let hash = bytes_1.arrayify(sha2_1.sha256(bytes));
            let signature = this.signingKey.signDigest(hash);
            let signedTransaction = transaction_1.serialize(tx, signature, this.compressedPublicKey);
            // Log signedTransaction
            if (overrides && overrides.logSignedTransaction) {
                overrides.logSignedTransaction(signedTransaction);
            }
            return signedTransaction;
        });
    }
    signMessage(message, excludeRecoveryParam) {
        return Promise.resolve(bytes_1.joinSignature(this.signingKey.signDigest(hash_1.hashMessage(message)), excludeRecoveryParam ? false : true));
    }
    getBalance(blockTag) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        return this.provider.getBalance(this.address, blockTag);
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
    getTransactionCount(blockTag) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        return this.provider.getTransactionCount(this.address, blockTag);
    }
    transfer(addressOrName, value, overrides) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        if (addressOrName instanceof Promise) {
            return addressOrName.then((address) => {
                return this.transfer(address, value, overrides);
            });
        }
        return this.provider.resolveName(addressOrName).then((address) => {
            let transaction = this.provider.getTransactionRequest("bank", "bank-send", {
                from: this.address,
                to: address,
                value: value,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                denom: (overrides && overrides.denom) ? overrides.denom : units_1.smallestUnitName
            });
            transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx: transaction });
            return this.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer failed", {
                        method: "mxw/msgSend",
                        receipt
                    });
                });
            });
        });
    }
    isWhitelisted(blockTag) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        return this.provider.isWhitelisted(this.address, blockTag);
    }
    getKycAddress(blockTag) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        return this.provider.getKycAddress(this.address, blockTag);
    }
    createAlias(name, appFee, overrides) {
        if (!this.provider) {
            errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' });
        }
        properties_1.checkProperties(appFee, {
            to: true,
            value: true
        }, true);
        if (utils_1.bigNumberify(appFee.value).lte(0)) {
            errors.throwError('create alias transaction require non-zero application fee', errors.MISSING_FEES, { value: appFee });
        }
        return properties_1.resolveProperties({ name: name }).then(({ name }) => {
            let transaction = this.provider.getTransactionRequest("nameservice", "nameservice-createAlias", {
                appFeeTo: appFee.to,
                appFeeValue: appFee.value.toString(),
                name,
                owner: this.address,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            transaction.fee = this.provider.getTransactionFee(undefined, undefined, { tx: transaction });
            return this.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create alias failed", {
                        method: "nameservice/createAlias",
                        receipt
                    });
                });
            });
        });
    }
    encrypt(password, options, progressCallback) {
        if (typeof (options) === 'function' && !progressCallback) {
            progressCallback = options;
            options = {};
        }
        if (progressCallback && typeof (progressCallback) !== 'function') {
            errors.throwError('invalid callback', errors.INVALID_ARGUMENT, { argument: 'progressCallback' });
        }
        if (!options) {
            options = {};
        }
        if (this.mnemonic) {
            // Make sure we don't accidentally bubble the mnemonic up the call-stack
            options = properties_1.shallowCopy(options);
            // Set the mnemonic and path
            options.mnemonic = this.mnemonic;
            options.path = this.path;
        }
        if (this.wordlist) {
            options.locale = this.wordlist;
        }
        return secretStorage.encrypt(this.privateKey, password, options, progressCallback);
    }
    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options) {
        if (!options) {
            options = {};
        }
        if (!options.entropyLength) {
            options.entropyLength = 16;
        }
        let entropy = random_bytes_1.randomBytes(options.entropyLength);
        if (options.extraEntropy) {
            entropy = bytes_1.arrayify(sha2_1.sha256(bytes_1.concat([entropy, options.extraEntropy])).substring(0, 34));
        }
        let mnemonic = hdnode_1.entropyToMnemonic(entropy, options.locale);
        return Wallet.fromMnemonic(mnemonic, options.path, options.locale);
    }
    static fromEncryptedJson(json, password, progressCallback) {
        if (json_wallet_1.isSecretStorageWallet(json)) {
            return secretStorage.decrypt(json, password, progressCallback).then(function (signingKey) {
                return new Wallet(signingKey);
            }).catch(error => {
                if ("invalid password" == error.message)
                    errors.throwError('invalid password', errors.INVALID_PASSWORD, {});
                throw error;
            });
        }
        return Promise.reject(errors.createError('invalid wallet JSON', errors.UNEXPECTED_ARGUMENT, {}));
    }
    static fromMnemonic(mnemonic, path, wordlist) {
        if (!path) {
            path = hdnode_1.defaultPath;
        }
        return new Wallet(hdnode_1.fromMnemonic(mnemonic, wordlist).derivePath(path));
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map