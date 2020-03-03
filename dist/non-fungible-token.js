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
var NonFungibleTokenActions;
(function (NonFungibleTokenActions) {
    NonFungibleTokenActions["transfer"] = "transfer";
    NonFungibleTokenActions["mint"] = "mint";
    NonFungibleTokenActions["burn"] = "burn";
    NonFungibleTokenActions["transferOwnership"] = "transferOwnership";
    NonFungibleTokenActions["acceptOwnership"] = "acceptOwnership";
})(NonFungibleTokenActions = exports.NonFungibleTokenActions || (exports.NonFungibleTokenActions = {}));
;
var NFTokenStateFlags;
(function (NFTokenStateFlags) {
    NFTokenStateFlags[NFTokenStateFlags["nonfungible"] = 1] = "nonfungible";
    NFTokenStateFlags[NFTokenStateFlags["mint"] = 2] = "mint";
    NFTokenStateFlags[NFTokenStateFlags["burn"] = 4] = "burn";
    NFTokenStateFlags[NFTokenStateFlags["frozen"] = 8] = "frozen";
    NFTokenStateFlags[NFTokenStateFlags["approved"] = 16] = "approved";
    NFTokenStateFlags[NFTokenStateFlags["transferable"] = 32] = "transferable";
    NFTokenStateFlags[NFTokenStateFlags["modifiable"] = 64] = "modifiable";
    NFTokenStateFlags[NFTokenStateFlags["public"] = 128] = "public";
})(NFTokenStateFlags = exports.NFTokenStateFlags || (exports.NFTokenStateFlags = {}));
;
class NonFungibleToken {
    constructor(symbol, signerOrProvider) {
        errors.checkNew(this, NonFungibleToken);
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
    get isApproved() {
        if (misc_1.isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (NFTokenStateFlags.approved & this._state.flags) ? true : false;
    }
    get isFrozen() {
        if (misc_1.isUndefinedOrNullOrEmpty(this._state)) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'state' });
        }
        return (NFTokenStateFlags.frozen & this._state.flags) ? true : false;
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
    refresh(overrides) {
        if (!this.symbol) {
            errors.throwError('not initialized', errors.NOT_INITIALIZED, { arg: 'symbol' });
        }
        return this.getState(null, Object.assign(Object.assign({}, overrides), { queryOnly: true })).then((state) => {
            this._state = state;
            return this;
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
        return this.provider.getNFTokenState(this.symbol, blockTag).then((result) => {
            if (!result) {
                errors.throwError('token state is not available', errors.NOT_AVAILABLE, {});
            }
            if (!(NFTokenStateFlags.nonfungible & result.flags)) {
                errors.throwError('class type mismatch', errors.UNEXPECTED_RESULT, { expected: "nonfungible", returned: result });
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
    * Transfer token ownership
    * @param addressOrName new owner address
    * @param overrides options
    */
    transferOwnership(addressOrName, overrides) {
        if (!this.signer) {
            errors.throwError('transfer non fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress(), addressOrName: addressOrName }).then(({ signerAddress, addressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('transfer non fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }
            return this.provider.resolveName(addressOrName).then((toAddress) => {
                let transaction = this.provider.getTransactionRequest("nonFungible", "transferNonFungibleTokenOwnership", {
                    symbol: this.symbol,
                    from: signerAddress,
                    to: toAddress,
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx: transaction });
                return this.signer.sendTransaction(transaction, overrides).then((response) => {
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
                        throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "transfer non fungible token ownership failed", {
                            method: "nonFungible-transferNonFungibleTokenOwnership",
                            receipt
                        });
                    });
                });
            });
        });
    }
    /**
    * Accept ownership by new owner
    * @param overrides options
    */
    acceptOwnership(overrides) {
        if (!this.signer) {
            errors.throwError('accept fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        this.isUsable; // check token useability, otherwise throw error
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress() }).then(({ signerAddress }) => {
            if (!signerAddress) {
                return errors.throwError('accept fungible token ownership require signer address', errors.MISSING_ARGUMENT, { required: 'signerAddress' });
            }
            let transaction = this.provider.getTransactionRequest("nonFungible", "acceptNonFungibleTokenOwnership", {
                symbol: this.symbol,
                from: signerAddress,
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            });
            transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee(undefined, undefined, { tx: transaction });
            return this.signer.sendTransaction(transaction, overrides).then((response) => {
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
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "accept non fungible token ownership failed", {
                        method: "token-acceptNonFungibleTokenOwnership",
                        response: response,
                        receipt
                    });
                });
            });
        });
    }
    /**
     * Load token instance by symbol
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol, signerOrProvider, overrides) {
        let token = new NonFungibleToken(symbol, signerOrProvider);
        return token.refresh(overrides).then(() => {
            return token;
        });
    }
    /**
     * Create non-fungible token
     * @param properties token properties
     * @param signer signer wallet
     * @param overrides options
     */
    static create(tokenProperties, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('create non fungible token transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        if (tokenProperties && 'string' === typeof (tokenProperties)) {
            tokenProperties = JSON.parse(tokenProperties);
        }
        properties_1.checkProperties(tokenProperties, {
            name: true,
            symbol: true,
            fee: true,
            metadata: false,
            properties: false //Optional
        }, true);
        properties_1.checkProperties(tokenProperties.fee, { to: true, value: true });
        return properties_1.resolveProperties({ address: signer.getAddress() }).then(({ address }) => {
            if (!address) {
                errors.throwError('create non fungible token transaction require signer address', errors.MISSING_ARGUMENT, { required: 'signer' });
            }
            let nonFungibleToken = misc_1.checkFormat({
                name: misc_1.checkString,
                symbol: misc_1.checkString,
                metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                properties: misc_1.allowNullOrEmpty(misc_1.checkString),
                fee: {
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber
                }
            }, tokenProperties);
            if (utils_1.bigNumberify(nonFungibleToken.fee.value).lte(0)) {
                errors.throwError('create non fungible token transaction require non-zero application fee', errors.MISSING_FEES, { value: nonFungibleToken });
            }
            let transaction = signer.provider.getTransactionRequest("nonFungible", "createNonFungibleToken", {
                appFeeTo: nonFungibleToken.fee.to,
                appFeeValue: nonFungibleToken.fee.value.toString(),
                name: nonFungibleToken.name,
                owner: address,
                memo: (overrides && overrides.memo) ? overrides.memo : "",
                metadata: nonFungibleToken.metadata || "",
                properties: nonFungibleToken.properties || "",
                symbol: nonFungibleToken.symbol
            });
            transaction.fee = signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });
            return signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return this.fromSymbol(tokenProperties.symbol, signer, overrides);
                    }
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "create non fungible token failed", {
                        method: "nonFungible-createNonFungibleToken",
                        receipt
                    });
                });
            });
        });
    }
    /**
   * Update non-fungible token metadata
   * @param metadata new metadata
   * @param overrides options
   */
    updateMetadata(metadata, overrides) {
        if (!this.signer) {
            errors.throwError('update non fungible token item metadata require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        return properties_1.resolveProperties({ address: this.signer.getAddress() }).then(({ address }) => {
            if (!address) {
                return errors.throwError('update non fungible token item metadata require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            let transaction = this.signer.provider.getTransactionRequest("nonFungible", "updateNFTMetadata", {
                symbol: this.symbol,
                from: address,
                metadata
            });
            transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });
            return this.signer.sendTransaction(transaction, overrides).then((response) => {
                if (overrides && overrides.sendOnly) {
                    return response;
                }
                let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                    if (1 == receipt.status) {
                        return receipt;
                    }
                    throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "update non fungible token item metadata failed", {
                        method: "nonfungible-updateMetadata",
                        receipt
                    });
                });
            });
        });
    }
    /**
    * Mint NFT item
    * @param toAddressOrName receiver address
    * @param item item to mint
    * @param overrides options
    */
    mint(toAddressOrName, item, overrides) {
        if (!this.signer) {
            errors.throwError('transfer non fungible token ownership require signer', errors.NOT_INITIALIZED, { arg: 'signer' });
        }
        properties_1.checkProperties(item, { symbol: true, itemID: true, properties: true, metadata: true });
        return properties_1.resolveProperties({ signerAddress: this.signer.getAddress(), toAddressOrName: toAddressOrName }).then(({ signerAddress, toAddressOrName }) => {
            if (!signerAddress) {
                return errors.throwError('mint fungible token require signer address', errors.MISSING_ARGUMENT, { arg: 'signerAddress' });
            }
            return this.signer.provider.resolveName(toAddressOrName).then((toAddress) => {
                let transaction = this.signer.provider.getTransactionRequest("nonFungible", "mintNonFungibleItem", {
                    symbol: item.symbol,
                    to: toAddress,
                    itemID: item.itemID,
                    owner: signerAddress,
                    properties: item.properties || "",
                    metadata: item.metadata || "",
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                });
                transaction.fee = (overrides && overrides.fee) ? overrides.fee : this.signer.provider.getTransactionFee(undefined, undefined, { tx: transaction });
                return this.signer.sendTransaction(transaction, overrides).then((response) => {
                    if (overrides && overrides.sendOnly) {
                        return response;
                    }
                    let confirmations = (overrides && overrides.confirmations) ? Number(overrides.confirmations) : null;
                    return this.signer.provider.waitForTransaction(response.hash, confirmations).then((receipt) => {
                        if (1 == receipt.status) {
                            return receipt;
                        }
                        throw this.signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "mint non fungible token failed", {
                            method: "nonFungible-mintNonFungibleToken",
                            receipt
                        });
                    });
                });
            });
        });
    }
    /**
     * Sign non fungible token status transaction by issuer
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signNonFungibleTokenStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('sign non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenStatus(transaction);
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
     * Sign non fungible token item status transaction by issuer
     * @param transaction non fungible token item status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signNonFungibleTokenItemStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('sign non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenItemStatus(transaction);
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
     * Approve non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveNonFungibleToken(symbol, signer, overrides) {
        return setNonFungibleTokenStatus(symbol, "APPROVE", signer, overrides);
    }
    /**
     * Reject non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectNonFungibleToken(symbol, signer, overrides) {
        return setNonFungibleTokenStatus(symbol, "REJECT", signer, overrides);
    }
    /**
     * Freeze non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeNonFungibleToken(symbol, signer, overrides) {
        return setNonFungibleTokenStatus(symbol, "FREEZE", signer, overrides);
    }
    /**
     * Unfreeze non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeNonFungibleToken(symbol, signer, overrides) {
        return setNonFungibleTokenStatus(symbol, "UNFREEZE", signer, overrides);
    }
    /**
     * Approve non fungible token ownership by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveNonFungibleTokenOwnership(symbol, signer, overrides) {
        return setNonFungibleTokenStatus(symbol, "APPROVE_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }
    /**
     * Reject fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectNonFungibleTokenOwnership(symbol, signer, overrides) {
        return setNonFungibleTokenStatus(symbol, "REJECT_TRANFER_TOKEN_OWNERSHIP", signer, overrides);
    }
    /**
     * Send non fungible token status transaction by middleware
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendNonFungibleTokenStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenStatus(transaction);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("nonFungible", "setNonFungibleTokenStatus", {
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
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set non fungible token status failed", {
                        method: "nonFungible-setNonFungibleTokenStatus",
                        receipt
                    });
                });
            });
        });
    }
    /**
     * Send non fungible token item status transaction by middleware
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendNonFungibleTokenItemStatusTransaction(transaction, signer, overrides) {
        if (!abstract_signer_1.Signer.isSigner(signer)) {
            errors.throwError('send non fungible token item status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
        }
        properties_1.checkProperties(transaction, { payload: true, signatures: true });
        transaction = checkNonFungibleTokenItemStatus(transaction);
        return properties_1.resolveProperties({ signerAddress: signer.getAddress() }).then(({ signerAddress }) => {
            let tx = signer.provider.getTransactionRequest("nonFungible", "setNonFungibleItemStatus", {
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
                    throw signer.provider.checkTransactionReceipt(receipt, errors.CALL_EXCEPTION, "set non fungible token item status failed", {
                        method: "nonFungible-setNonFungibleItemStatus",
                        receipt
                    });
                });
            });
        });
    }
    /**
     * Freeze NFT item by provider
     * @param symbol token item symbol
     * @param itemID token item id
     * @param overrides options
     */
    static freezeNonFungibleTokenItem(symbol, itemID, signer, overrides) {
        return setNonFungibleTokenItemStatus(symbol, itemID, "FREEZE_ITEM", signer, overrides);
    }
    /**
     * Unfreeze NFT item by provider
     * @param symbol token item symbol
     * @param itemID token item id
     * @param overrides options
     */
    static unfreezeNonFungibleTokenItem(symbol, itemID, signer, overrides) {
        return setNonFungibleTokenItemStatus(symbol, itemID, "UNFREEZE_ITEM", signer, overrides);
    }
}
exports.NonFungibleToken = NonFungibleToken;
function checkNonFungibleTokenFee(data) {
    let fee = misc_1.checkFormat({
        action: misc_1.checkString,
        feeName: misc_1.checkString
    }, data);
    if (misc_1.isUndefinedOrNullOrEmpty(NonFungibleTokenActions[fee.action])) {
        return errors.throwError("invalid non fungible token fee", errors.INVALID_ARGUMENT, { value: fee });
    }
    return fee;
}
function setNonFungibleTokenStatus(symbol, status, signer, overrides) {
    if (!abstract_signer_1.Signer.isSigner(signer)) {
        errors.throwError('set non fungible token status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    properties_1.checkProperties({ symbol, status }, { symbol: true, status: true });
    let tokenFees;
    let mintLimit, transferLimit;
    let endorserList = null;
    let burnable, transferable, modifiable, pub;
    burnable = (overrides && overrides.burnable) ? true : false;
    transferable = (overrides && overrides.transferable) ? true : false;
    modifiable = (overrides && overrides.modifiable) ? true : false;
    pub = (overrides && overrides.pub) ? true : false;
    switch (status) {
        case "APPROVE":
            let params = misc_1.checkFormat({
                mintLimit: misc_1.checkBigNumberString,
                transferLimit: misc_1.checkBigNumberString,
            }, overrides);
            mintLimit = params.mintLimit;
            transferLimit = params.transferLimit;
            if (overrides) {
                if (overrides.tokenFees) {
                    let tokenProperties = misc_1.checkFormat({
                        tokenFees: misc_1.arrayOf(checkNonFungibleTokenFee)
                    }, overrides);
                    tokenFees = tokenProperties.tokenFees;
                }
                if (overrides.endorserList) {
                    let endorsers = misc_1.checkFormat({
                        endorserList: misc_1.allowNullOrEmpty(misc_1.arrayOf(misc_1.checkString))
                    }, overrides);
                    endorserList = endorsers.endorserList;
                    if (endorserList.length == 0)
                        endorserList = null;
                }
            }
            if (misc_1.isUndefinedOrNullOrEmpty(tokenFees)) {
                errors.throwError('non fungible token fees are missing', errors.MISSING_ARGUMENT, { arg: 'tokenFees' });
            }
            break;
        case "APPROVE_TRANFER_TOKEN_OWNERSHIP":
        case "REJECT_TRANFER_TOKEN_OWNERSHIP":
        case "REJECT":
            mintLimit = "0";
            transferLimit = "0";
            endorserList = null;
            break;
        case "FREEZE":
        case "UNFREEZE":
            break;
        default:
            errors.throwError('invalid non fungible token status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
                        transferLimit,
                        mintLimit,
                        tokenFees,
                        endorserList,
                        burnable,
                        transferable,
                        modifiable,
                        pub
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
function checkNonFungibleTokenStatus(data) {
    return misc_1.checkFormat({
        payload: function (value) {
            return misc_1.checkFormat({
                token: {
                    endorserList: misc_1.checkAny,
                    from: misc_1.checkAddress,
                    mintLimit: misc_1.checkBigNumber,
                    nonce: misc_1.checkBigNumber,
                    status: misc_1.checkString,
                    symbol: misc_1.checkString,
                    tokenFees: misc_1.allowNullOrEmpty(misc_1.arrayOf(checkNonFungibleTokenFee)),
                    transferLimit: misc_1.checkBigNumber,
                    burnable: misc_1.checkBoolean,
                    transferable: misc_1.checkBoolean,
                    modifiable: misc_1.checkBoolean,
                    pub: misc_1.checkBoolean
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
function setNonFungibleTokenItemStatus(symbol, itemID, status, signer, overrides) {
    if (!abstract_signer_1.Signer.isSigner(signer)) {
        errors.throwError('set non fungible token item status transaction require signer', errors.MISSING_ARGUMENT, { arg: 'signer' });
    }
    if (!symbol) {
        errors.throwError('set non fungible token item status transaction require symbol', errors.MISSING_ARGUMENT, { arg: 'symbol' });
    }
    if (!itemID) {
        errors.throwError('set non fungible token item status transaction require itemID', errors.MISSING_ARGUMENT, { arg: 'itemID' });
    }
    switch (status) {
        case "FREEZE_ITEM":
        case "UNFREEZE_ITEM":
            break;
        default:
            errors.throwError('invalid non fungible token item status', errors.UNEXPECTED_ARGUMENT, { arg: 'status', value: status });
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
                    item: {
                        from: signerAddress,
                        nonce,
                        status,
                        symbol,
                        itemID
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
            return signer.signMessage(JSON.stringify(transaction.payload.item), true).then((signature) => {
                transaction.payload.signature = base64_1.encode(signature);
                return transaction;
            });
        });
    });
}
function checkNonFungibleTokenItemStatus(data) {
    return misc_1.checkFormat({
        payload: function (value) {
            return misc_1.checkFormat({
                item: {
                    from: misc_1.checkAddress,
                    nonce: misc_1.checkBigNumber,
                    status: misc_1.checkString,
                    symbol: misc_1.checkString,
                    itemID: misc_1.checkString
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
//# sourceMappingURL=non-fungible-token.js.map