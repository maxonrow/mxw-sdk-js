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
const abstract_provider_1 = require("./providers/abstract-provider");
const abstract_signer_1 = require("./abstract-signer");
const utils_1 = require("./utils");
var FungibleTokenActions;
(function (FungibleTokenActions) {
    FungibleTokenActions["transfer"] = "transfer";
    FungibleTokenActions["mint"] = "mint";
    FungibleTokenActions["burn"] = "burn";
    FungibleTokenActions["transferOwnership"] = "transferOwnership";
    FungibleTokenActions["acceptOwnership"] = "acceptOwnership";
})(FungibleTokenActions = exports.FungibleTokenActions || (exports.FungibleTokenActions = {}));
;
var TokenStateFlags;
(function (TokenStateFlags) {
    TokenStateFlags[TokenStateFlags["fungible"] = 1] = "fungible";
    TokenStateFlags[TokenStateFlags["mint"] = 2] = "mint";
    TokenStateFlags[TokenStateFlags["burn"] = 4] = "burn";
    TokenStateFlags[TokenStateFlags["frozen"] = 8] = "frozen";
    TokenStateFlags[TokenStateFlags["approved"] = 16] = "approved";
})(TokenStateFlags = exports.TokenStateFlags || (exports.TokenStateFlags = {}));
;
exports.DynamicSupplyFungibleTokenFlag = TokenStateFlags.fungible + TokenStateFlags.mint + TokenStateFlags.burn;
exports.FixedSupplyFungibleTokenFlag = TokenStateFlags.fungible;
exports.FixedSupplyBurnableFungibleTokenFlag = TokenStateFlags.fungible + TokenStateFlags.burn;
function checkFungibleTokenStatus(data) {
    return misc_1.checkFormat({
        payload: function (value) {
            return misc_1.checkFormat({
                token: {
                    from: misc_1.checkAddress,
                    nonce: misc_1.checkBigNumber,
                    status: misc_1.checkString,
                    symbol: misc_1.checkString,
                    tokenFees: misc_1.allowNullOrEmpty(misc_1.arrayOf(checkFungibleTokenFee)),
                    burnable: misc_1.allowNullOrEmpty(misc_1.checkBoolean)
                },
                pub_key: {
                    type: misc_1.checkString,
                    value: misc_1.checkString
                },
                signature: misc_1.checkString
            }, value);
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
    }, data);
}
function checkFungibleTokenFee(data) {
    let fee = misc_1.checkFormat({
        action: misc_1.checkString,
        feeName: misc_1.checkString
    }, data);
    if (misc_1.isUndefinedOrNullOrEmpty(FungibleTokenActions[fee.action])) {
        return errors.throwError("invalid fungible token fee", errors.INVALID_ARGUMENT, { value: fee });
    }
    return fee;
}
function checkFungibleTokenAccountStatus(data) {
    return misc_1.checkFormat({
        payload: function (value) {
            return misc_1.checkFormat({
                tokenAccount: {
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    nonce: misc_1.checkBigNumber,
                    status: misc_1.checkString,
                    symbol: misc_1.checkString
                },
                pub_key: {
                    type: misc_1.checkString,
                    value: misc_1.checkString
                },
                signature: misc_1.checkString
            }, value);
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
    }, data);
}
class FungibleToken {
    constructor(symbol, signerOrProvider) {
        errors.checkNew(this, FungibleToken);
        if (!symbol) {
            errors.throwError('symbol is required', errors.MISSING_ARGUMENT, { arg: 'symbol' });
        }
        properties_1.defineReadOnly(this, 'symbol', symbol);
        if (abstract_signer_1.Signer.isSigner(signerOrProvider)) {
            if (!signerOrProvider.provider) {
                return errors.throwError('missing provider', errors.INVALID_ARGUMENT, { arg: 'signerOrProvider', value: signerOrProvider });
            }
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
    get state() { return this._state; }
    get accountState() { return this._accountState; }
    get isApproved() {
        if (misc_1.isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (TokenStateFlags.approved & this._state.flags) ? true : false;
    }
    get isFrozen() {
        if (misc_1.isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (TokenStateFlags.frozen & this._state.flags) ? true : false;
    }
    get isUsable() {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        if (!this.isApproved) {
            errors.throwError('required approval', errors.NOT_ALLOWED, { action: "useability", state: this._state });
        }
        if (this.isFrozen) {
            errors.throwError('frozen', errors.NOT_ALLOWED, { action: "useability", state: this._state });
        }
        return true;
    }
    get isMintable() {
        this.isUsable; // check token useability, otherwise throw error
        if (!(TokenStateFlags.mint & this._state.flags)) {
            errors.throwError('not mintable', errors.NOT_ALLOWED, { action: "mintable", state: this._state });
        }
        return true;
    }
    get isBurnable() {
        this.isUsable; // check token useability, otherwise throw error
        if (!(TokenStateFlags.burn & this._state.flags)) {
            errors.throwError('not burnable', errors.NOT_ALLOWED, { action: "burnable", state: this._state });
        }
        return true;
    }
    refresh(overrides) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.getState(null, Object.assign(Object.assign({}, overrides), { queryOnly: true })).then((state) => {
            if (!this.signer) {
                this._state = state;
                return this;
            }
            return this.getAccountState(null, Object.assign(Object.assign({}, overrides), { queryOnly: true })).then((accountState) => {
                // Update states in one go
                this._state = state;
                this._accountState = accountState;
                return this;
            });
        });
    }
    /**
     * Query token state
     * @param blockTag reserved for future
     * @param overrides options
     */
    getState(blockTag, overrides) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.provider.getTokenState(this.symbol, blockTag).then((result) => {
            if (!result) {
                errors.throwError('token state is not available', errors.NOT_AVAILABLE, {});
            }
            if (!(TokenStateFlags.fungible & result.flags)) {
                errors.throwError('class type mismatch', errors.UNEXPECTED_RESULT, { expected: "fungible", returned: result });
            }
            if (this.symbol != result.symbol) {
                errors.throwError('token symbol mismatch', errors.UNEXPECTED_RESULT, { expected: this.symbol, returned: result });
            }
            if (!(overrides && overrides.queryOnly)) {
                this._state = result;
            }
            return result;
        });
    }
    /**
     * Query token account
     * @param blockTag reserved for future
     * @param overrides options
     */
    getAccountState(blockTag, overrides) {
        if (!this.signer) {
            errors.throwError('query fungible token account require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                errors.throwError('query fungible token account require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            return this.provider.getTokenAccountState(this.symbol, signerAddress, blockTag).then((result) => {
                if (!(overrides && overrides.queryOnly)) {
                    this._accountState = result;
                }
                return result;
            });
        });
    }
    /**
     * Query token balance
     * @param blockTag reserved for future
     * @param overrides options
     */
    getBalance(blockTag, overrides) {
        return this.getAccountState(blockTag, overrides).then((accountState) => {
            if (accountState && accountState.balance) {
                return utils_1.bigNumberify(accountState.balance);
            }
            return utils_1.bigNumberify("0");
        });
    }
    /**
     * Transfer token by wallet
     * @param toAddressOrName receiver address
     * @param value number of token to transfer
     * @param overrides options
     */
    transfer(toAddressOrName, value, overrides) {
        return this.getTransferTransactionRequest(toAddressOrName, value, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer fungible token failed", {
                        method: "token-transferFungibleToken",
                        receipt
                    });
                });
            });
        });
    }
    getTransferTransactionRequest(toAddressOrName, value, overrides) {
        if (!this.signer) {
            errors.throwError('transfer fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.isUsable; // check token useability, otherwise throw error
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            return this.provider.resolveName(toAddressOrName).then((toAddress) => {
                let tx = this.provider.getTransactionRequest("token", "token-transferFungibleToken", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    value: value.toString(),
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
                return tx;
            });
        });
    }
    /**
     * Mint token by owner
     * @param toAddressOrName receiver address
     * @param value number of token to mint
     * @param overrides options
     */
    mint(toAddressOrName, value, overrides) {
        return this.getMintTransactionRequest(toAddressOrName, value, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "mint fungible token failed", {
                        method: "token-mintFungibleToken",
                        receipt
                    });
                });
            });
        });
    }
    getMintTransactionRequest(toAddressOrName, value, overrides) {
        if (!this.signer) {
            errors.throwError('mint fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.isMintable; // check token useability and mintable, otherwise throw error
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('mint fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            return this.provider.resolveName(toAddressOrName).then((toAddress) => {
                let tx = this.provider.getTransactionRequest("token", "token-mintFungibleToken", {
                    symbol: this.symbol,
                    to: toAddress,
                    value: value.toString(),
                    owner: signerAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
                return tx;
            });
        });
    }
    /**
     * Burn token by wallet
     * @param value number of token to burn
     * @param overrides options
     */
    burn(value, overrides) {
        return this.getBurnTransactionRequest(value, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "burn fungible token failed", {
                        method: "token-burnFungibleToken",
                        receipt
                    });
                });
            });
        });
    }
    getBurnTransactionRequest(value, overrides) {
        if (!this.signer) {
            errors.throwError('burn fungible token require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.isBurnable; // check token useability and burnable, otherwise throw error
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('burn fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            let tx = this.provider.getTransactionRequest("token", "token-burnFungibleToken", {
                symbol: this.symbol,
                from: signerAddress,
                value: value.toString(),
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
            return tx;
        });
    }
    /**
     * Transfer token ownership
     * @param addressOrName new owner address
     * @param overrides options
     */
    transferOwnership(addressOrName, overrides) {
        return this.getTransferOwnershipTransactionRequest(addressOrName, overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.getState(null, overrides).then(() => {
                            return receipt;
                        });
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer fungible token ownership failed", {
                        method: "token-transferFungibleTokenOwnership",
                        receipt
                    });
                });
            });
        });
    }
    getTransferOwnershipTransactionRequest(addressOrName, overrides) {
        if (!this.signer) {
            errors.throwError('transfer fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.isUsable; // check token useability, otherwise throw error
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress(), addressOrName: addressOrName }).then(({ signerAddress, addressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }
            return this.provider.resolveName(addressOrName).then((toAddress) => {
                let tx = this.provider.getTransactionRequest("token", "token-transferFungibleTokenOwnership", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
                return tx;
            });
        });
    }
    /**
     * Accept ownership by new owner
     * @param overrides options
     */
    acceptOwnership(overrides) {
        return this.getAcceptOwnershipTransactionRequest(overrides).then((tx) => {
            return this.signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.getState(null, overrides).then(() => {
                            return receipt;
                        });
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "accept fungible token ownership failed", {
                        method: "token-acceptFungibleTokenOwnership",
                        response: response,
                        receipt
                    });
                });
            });
        });
    }
    getAcceptOwnershipTransactionRequest(overrides) {
        if (!this.signer) {
            errors.throwError('accept fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.isUsable; // check token useability, otherwise throw error
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('accept fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }
            let tx = this.provider.getTransactionRequest("token", "token-acceptFungibleTokenOwnership", {
                symbol: this.symbol,
                from: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            tx.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx });
            return tx;
        });
    }
    /**
     * Load token instance by symbol
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol, signerOrProvider, overrides) {
        let token = new FungibleToken(symbol, signerOrProvider);
        return token.refresh().then(() => {
            return token;
        });
    }
    /**
     * Create fungible token
     * @param properties token properties
     * @param signer signer wallet
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
                        return this.fromSymbol(properties.symbol, signer, overrides);
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create fungible token failed", {
                        method: "token-createFungibleToken",
                        receipt
                    });
                });
            });
        });
    }
    static getCreateTransactionRequest(properties, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('create fungible token transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (properties && 'string' === typeof (properties)) {
            properties = JSON.parse(properties);
        }
        properties_1.checkProperties(properties, {
            name: true,
            symbol: true,
            decimals: true,
            fixedSupply: true,
            maxSupply: true,
            fee: true,
            owner: false,
            metadata: false // Optional
        }, true);
        properties_1.checkProperties(properties.fee, { to: true, value: true });
        return properties_1.resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('create fungible token transaction require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            properties.owner = address; // Set signer address as owner
            let fungibleToken = misc_1.checkFormat({
                name: misc_1.checkString,
                symbol: misc_1.checkString,
                decimals: misc_1.checkNumber,
                fixedSupply: misc_1.checkBoolean,
                maxSupply: misc_1.checkBigNumber,
                owner: misc_1.allowNull(misc_1.checkAddress),
                metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                fee: {
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber
                }
            }, properties);
            let tx = signer.provider.getTransactionRequest("token", "token-createFungibleToken", {
                appFeeTo: fungibleToken.fee.to,
                appFeeValue: fungibleToken.fee.value.toString(),
                name: fungibleToken.name,
                owner: fungibleToken.owner,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                decimals: fungibleToken.decimals,
                fixedSupply: fungibleToken.fixedSupply,
                metadata: fungibleToken.metadata || "",
                symbol: fungibleToken.symbol,
                maxSupply: fungibleToken.maxSupply
            });
            tx.fee = signer.provider.getTransactionFee(undefined, undefined, { tx });
            return tx;
        });
    }
    /**
     * Sign fungible token status transaction by issuer
     * @param transaction fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signFungibleTokenStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('sign fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenStatus(transaction);
        return properties_1.resolveProperties({
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ publicKeyType, compressedPublicKey }) => {
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
     * Sign fungible token account status transaction by issuer
     * @param transaction fungible token account status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signFungibleTokenAccountStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('sign fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenAccountStatus(transaction);
        return properties_1.resolveProperties({
            publicKeyType: signer.getPublicKeyType(),
            compressedPublicKey: signer.getCompressedPublicKey()
        }).then(({ publicKeyType, compressedPublicKey }) => {
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
     * Send fungible token status transaction by middleware
     * @param transaction fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendFungibleTokenStatusTransaction(transaction, signer, overrides) {
        return this.getFungibleTokenStatusTransactionRequest(transaction, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set fungible token status failed", {
                        method: "token-setFungibleTokenStatus",
                        receipt
                    });
                });
            });
        });
    }
    static getFungibleTokenStatusTransactionRequest(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenStatus(transaction);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("token", "token-setFungibleTokenStatus", {
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
     * Send fungible token account status transaction by middleware
     * @param transaction fungible token account status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendFungibleTokenAccountStatusTransaction(transaction, signer, overrides) {
        return this.getFungibleTokenAccountStatusTransactionRequest(transaction, signer, overrides).then((tx) => {
            return signer.sendTransaction(tx, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set fungible token account status failed", {
                        method: "token-setFungibleTokenAccountStatus",
                        receipt
                    });
                });
            });
        });
    }
    static getFungibleTokenAccountStatusTransactionRequest(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkFungibleTokenAccountStatus(transaction);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("token", "token-setFungibleTokenAccountStatus", {
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
     * Approve fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveFungibleToken(symbol, signer, overrides) {
        return setFungibleTokenStatus(symbol, "APPROVE", signer, overrides);
    }
    /**
     * Reject fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectFungibleToken(symbol, signer, overrides) {
        return setFungibleTokenStatus(symbol, "REJECT", signer, overrides);
    }
    /**
     * Freeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeFungibleToken(symbol, signer, overrides) {
        return setFungibleTokenStatus(symbol, "FREEZE", signer, overrides);
    }
    /**
     * Unfreeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeFungibleToken(symbol, signer, overrides) {
        return setFungibleTokenStatus(symbol, "UNFREEZE", signer, overrides);
    }
    /**
     * Approve fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveFungibleTokenOwnership(symbol, signer, overrides) {
        return setFungibleTokenStatus(symbol, "APPROVE_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }
    /**
     * Reject fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectFungibleTokenOwnership(symbol, signer, overrides) {
        return setFungibleTokenStatus(symbol, "REJECT_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }
    /**
     * Freeze fungible token account by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeFungibleTokenAccount(symbol, to, signer, overrides) {
        return setFungibleTokenAccountStatus(symbol, to, "FREEZE_ACCOUNT", signer, overrides);
    }
    /**
     * Unfreeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeFungibleTokenAccount(symbol, to, signer, overrides) {
        return setFungibleTokenAccountStatus(symbol, to, "UNFREEZE_ACCOUNT", signer, overrides);
    }
}
exports.FungibleToken = FungibleToken;
function setFungibleTokenStatus(symbol, status, signer, overrides) {
    if (!abstract_signer_1.Signer.isSigner(signer)) {
        errors.throwError('set fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!symbol) {
        errors.throwError('set fungible token status transaction require symbol', errors.MISSING_ARGUMENT, { arg: 'symbol' });
    }
    let tokenFees;
    let burnable = true;
    switch (status) {
        case "APPROVE":
            if (overrides) {
                if (misc_1.isUndefinedOrNull(overrides.burnable)) {
                    errors.throwError('fungible token burnable setting is missing', errors.MISSING_ARGUMENT, { arg: 'burnable' });
                }
                burnable = overrides.burnable ? true : false;
                if (overrides.tokenFees) {
                    let tokenProperties = misc_1.checkFormat({
                        tokenFees: misc_1.arrayOf(checkFungibleTokenFee)
                    }, overrides);
                    tokenFees = tokenProperties.tokenFees;
                }
            }
            if (misc_1.isUndefinedOrNullOrEmpty(tokenFees)) {
                errors.throwError('fungible token fees are missing', errors.MISSING_ARGUMENT, { arg: 'tokenFees' });
            }
            break;
        case "REJECT":
        case "FREEZE":
        case "UNFREEZE":
        case "APPROVE_TRANFER_TOKEN_OWNERSHIP":
        case "REJECT_TRANFER_TOKEN_OWNERSHIP":
            break;
        default:
            errors.throwError('invalid fungible token status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
            let transaction = misc_1.sortObject(misc_1.iterate({
                payload: {
                    token: {
                        from: signerAddress,
                        nonce,
                        status,
                        symbol,
                        tokenFees,
                        burnable
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64_1.encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            }, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            }));
            return signer.signMessage(JSON.stringify(transaction.payload.token), true).then((signature) => {
                transaction.payload.signature = base64_1.encode(signature);
                return transaction;
            });
        });
    });
}
function setFungibleTokenAccountStatus(symbol, to, status, signer, overrides) {
    if (!abstract_signer_1.Signer.isSigner(signer)) {
        errors.throwError('set fungible token account status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!symbol) {
        errors.throwError('set fungible token account status transaction require symbol', errors.MISSING_ARGUMENT, { arg: 'symbol' });
    }
    if (!to) {
        errors.throwError('set fungible token account status transaction require target account', errors.MISSING_ARGUMENT, { arg: 'to' });
    }
    switch (status) {
        case "FREEZE_ACCOUNT":
        case "UNFREEZE_ACCOUNT":
            try {
                to = misc_1.checkAddress(to);
            }
            catch (error) {
                errors.throwError('fungible token target account is not valid', errors.INVALID_ADDRESS, { arg: 'to', value: to });
            }
            break;
        default:
            errors.throwError('invalid fungible token account status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
            let transaction = misc_1.sortObject(misc_1.iterate({
                payload: {
                    tokenAccount: {
                        from: signerAddress,
                        nonce,
                        status,
                        symbol,
                        to
                    },
                    pub_key: {
                        type: "tendermint/" + publicKeyType,
                        value: base64_1.encode(compressedPublicKey)
                    },
                    signature: ""
                },
                signatures: []
            }, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            }));
            return signer.signMessage(JSON.stringify(transaction.payload.tokenAccount), true).then((signature) => {
                transaction.payload.signature = base64_1.encode(signature);
                return transaction;
            });
        });
    });
}
//# sourceMappingURL=token.js.map