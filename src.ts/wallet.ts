'use strict';

import { arrayify, concat, joinSignature } from './utils/bytes';
import { BigNumber, BigNumberish } from './utils/bignumber';
import { hashMessage } from './utils/hash';
import { defaultPath, HDNode, entropyToMnemonic, fromMnemonic } from './utils/hdnode';
import { isSecretStorageWallet } from './utils/json-wallet';
import { checkProperties, defineReadOnly, resolveProperties, shallowCopy } from './utils/properties';
import { randomBytes } from './utils/random-bytes';
import * as secretStorage from './utils/secret-storage';
import { SigningKey } from './utils/signing-key';
import { populateTransaction, serialize as serializeTransaction } from './utils/transaction';
import { Wordlist } from './utils/wordlist';
import { sha256 } from './utils/sha2';
import { sortObject, iterate, isUndefinedOrNullOrEmpty } from './utils/misc';
import { toUtf8Bytes, bigNumberify } from './utils';
import { smallestUnitName } from './utils/units';

// Imported Abstracts
import { Signer as AbstractSigner } from './abstract-signer';
import { Provider } from './providers/abstract-provider';

// Imported Types
import { ProgressCallback } from './utils/secret-storage';
import { Arrayish } from './utils/bytes';
import { BlockTag, TransactionRequest, TransactionResponse, TransactionReceipt } from './providers/abstract-provider';

import * as errors from './errors';

export class Wallet extends AbstractSigner {

    readonly provider: Provider;
    private readonly signingKey: SigningKey;

    private accountNumber: BigNumber;

    constructor(privateKey: SigningKey | HDNode | Arrayish, provider?: Provider) {
        super();
        errors.checkNew(this, Wallet);

        // Make sure we have a valid signing key
        if (SigningKey.isSigningKey(privateKey)) {
            defineReadOnly(this, 'signingKey', privateKey);
        } else {
            defineReadOnly(this, 'signingKey', new SigningKey(privateKey));
        }

        defineReadOnly(this, 'provider', provider);
    }

    get address(): string { return this.signingKey.address; }
    get hexAddress(): string { return this.signingKey.hexAddress; }

    get mnemonic(): string { return this.signingKey.mnemonic; }
    get wordlist(): Wordlist { return this.signingKey.wordlist; }
    get path(): string { return this.signingKey.path; }

    get privateKey(): string { return this.signingKey.privateKey; }
    get publicKey(): string { return this.signingKey.compressedPublicKey; }
    get publicKeyType(): string { return this.signingKey.publicKeyType; }
    get compressedPublicKey(): string { return this.signingKey.compressedPublicKey; }
    get extendedPublicKey(): string { return this.signingKey.publicKey; }

    computeSharedSecret(otherPublicKey: string) {
        return this.signingKey.computeSharedSecret(otherPublicKey);
    }

    /**
     *  Create a new instance of this Wallet connected to provider.
     */
    connect(provider: Provider): Wallet {
        if (!(Provider.isProvider(provider))) {
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

    getNonce() {
        return this.nonce;
    }

    clearNonce() {
        this.nonce = undefined;
    }

    sendTransaction(transaction: TransactionRequest, overrides?: any): Promise<TransactionResponse> {
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

    sign(transaction: TransactionRequest, overrides?: any) {
        if (transaction.nonce == null || transaction.accountNumber == null) {
            transaction = shallowCopy(transaction);

            if (transaction.nonce == null) {
                transaction.nonce = this.getTransactionCount("pending");
            }
            if (transaction.accountNumber == null) {
                transaction.accountNumber = this.getAccountNumber();
            }
        }
        return resolveProperties(transaction).then((tx) => {
            if (!tx.nonce || !tx.accountNumber || !tx.value || !tx.value.msg || !Array.isArray(tx.value.msg)) {
                errors.throwError('missing transaction field', errors.MISSING_ARGUMENT, { argument: 'value', value: tx });
            }
            if (!Array.isArray(tx.value.msg)) {
                errors.throwError('invalid transaction field', errors.MISSING_ARGUMENT, { argument: 'value', value: tx });
            }

            if (!tx.value.fee) {
                tx.value.fee = transaction.fee;
            }

            let accountNumber = tx.accountNumber;
            let sequence = tx.nonce;

            // Cater for MultiSig signature for internal transaction
            if (overrides && !isUndefinedOrNullOrEmpty(overrides.accountNumber) && !isUndefinedOrNullOrEmpty(overrides.nonce)) {
                accountNumber = overrides.accountNumber;
                sequence = overrides.nonce;
            }
            else {
                // Control the nonce to cater bulk transaction submission
                if (overrides && overrides.bulkSend) {
                    if (undefined !== this.nonce) {
                        if (this.nonce.gte(tx.nonce)) {
                            tx.nonce = this.nonce.add(1);
                        }
                    }
                }
                this.nonce = tx.nonce;
                sequence = tx.nonce.toString();
            }

            let payload = {
                account_number: accountNumber.toString() || '0',
                chain_id: tx.chainId,
                fee: tx.fee,
                memo: tx.value.memo,
                msgs: tx.value.msg,
                sequence: sequence.toString() || '0'
            };

            // Convert number and big number to string
            payload = iterate(payload, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            payload = sortObject(payload);

            // Log signature payload
            if (overrides && overrides.logSignaturePayload) {
                overrides.logSignaturePayload(payload);
            }

            let bytes = toUtf8Bytes(JSON.stringify(payload));
            let hash = arrayify(sha256(bytes));
            let signature = this.signingKey.signDigest(hash);
            let signedTransaction = serializeTransaction(tx, signature, this.compressedPublicKey);

            // Log signedTransaction
            if (overrides && overrides.logSignedTransaction) {
                overrides.logSignedTransaction(signedTransaction);
            }
            return signedTransaction;
        });
    }

    signMessage(message: Arrayish | string, excludeRecoveryParam?: boolean) {
        return Promise.resolve(joinSignature(this.signingKey.signDigest(hashMessage(message)), excludeRecoveryParam ? false : true));
    }

    getBalance(blockTag?: BlockTag) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }
        return this.provider.getBalance(this.address, blockTag);
    }

    getAccountNumber(blockTag?: BlockTag) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }

        if (!this.accountNumber) {
            return this.provider.getAccountNumber(this.address, blockTag).then((accountNumber) => {
                this.accountNumber = accountNumber;
                return Promise.resolve(this.accountNumber);
            });
        }

        return Promise.resolve(this.accountNumber);
    }

    getTransactionCount(blockTag?: BlockTag) {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }
        return this.provider.getTransactionCount(this.address, blockTag);
    }

    transfer(addressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }

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
                denom: (overrides && overrides.denom) ? overrides.denom : smallestUnitName
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

    isWhitelisted(blockTag?: BlockTag): Promise<Boolean> {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }
        return this.provider.isWhitelisted(this.address, blockTag);
    }

    getKycAddress(blockTag?: BlockTag): Promise<string> {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }
        return this.provider.getKycAddress(this.address, blockTag);
    }

    createAlias(name: string | Promise<string>, appFee: { to: string, value: BigNumberish }, overrides?: any): Promise<TransactionResponse | TransactionReceipt> {
        if (!this.provider) { errors.throwError('missing provider', errors.NOT_INITIALIZED, { argument: 'provider' }); }

        checkProperties(appFee, {
            to: true,
            value: true
        }, true);

        if (bigNumberify(appFee.value).lte(0)) {
            errors.throwError('create alias transaction require non-zero application fee', errors.MISSING_FEES, { value: appFee });
        }

        return resolveProperties({ name: name }).then(({ name }) => {
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

    encrypt(password: Arrayish | string, options?: any, progressCallback?: ProgressCallback): Promise<string> {
        if (typeof (options) === 'function' && !progressCallback) {
            progressCallback = options;
            options = {};
        }

        if (progressCallback && typeof (progressCallback) !== 'function') {
            errors.throwError('invalid callback', errors.INVALID_ARGUMENT, { argument: 'progressCallback' });
        }

        if (!options) { options = {}; }

        if (this.mnemonic) {
            // Make sure we don't accidentally bubble the mnemonic up the call-stack
            options = shallowCopy(options);

            // Set the mnemonic and path
            options.mnemonic = this.mnemonic;
            options.path = this.path
        }

        if (this.wordlist) {
            options.locale = this.wordlist;
        }

        return secretStorage.encrypt(this.privateKey, password, options, progressCallback);
    }

    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options?: any): Wallet {
        if (!options) { options = {}; }

        if (!options.entropyLength) {
            options.entropyLength = 16;
        }

        let entropy: Uint8Array = randomBytes(options.entropyLength);

        if (options.extraEntropy) {
            entropy = arrayify(sha256(concat([entropy, options.extraEntropy])).substring(0, 34));
        }

        let mnemonic = entropyToMnemonic(entropy, options.locale);
        return Wallet.fromMnemonic(mnemonic, options.path, options.locale);
    }

    static fromEncryptedJson(json: string, password: Arrayish, progressCallback?: ProgressCallback): Promise<Wallet> {
        if (isSecretStorageWallet(json)) {
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

    static fromMnemonic(mnemonic: string, path?: string, wordlist?: Wordlist): Wallet {
        if (!path) { path = defaultPath; }
        return new Wallet(fromMnemonic(mnemonic, wordlist).derivePath(path));
    }
}
