"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const errors = __importStar(require("../errors"));
const bignumber_1 = require("./bignumber");
const bytes_1 = require("./bytes");
const properties_1 = require("./properties");
const base64_1 = require("./base64");
const utf8_1 = require("./utf8");
const abstract_provider_1 = require("../providers/abstract-provider");
const sha2_1 = require("./sha2");
const misc_1 = require("./misc");
const units_1 = require("./units");
///////////////////////////////
// function handleAddress(value: string): string {
//     if (value === '0x') { return null; }
//     return getAddress(value);
// }
function handleNumber(value) {
    if (value === '0x') {
        return bignumber_1.bigNumberify(value).toNumber();
    }
    return parseInt(value);
}
function handleBigNumber(value) {
    if (value === '0x') {
        return constants_1.Zero;
    }
    return bignumber_1.bigNumberify(value);
}
const transactionFields = [
    { name: 'type' }, { name: 'value' }
];
const allowedTransactionKeys = {
    type: true, value: true, nonce: true, chainId: true, fee: true,
    check_tx: true, deliver_tx: true, hash: true, height: true, accountNumber: true
};
const allowedTransactionValueKeys = {
    type: true, msg: true, fee: true, signatures: true, memo: true
};
function checkTransaction(transaction) {
    properties_1.checkProperties(transaction, allowedTransactionKeys);
    if (transaction.value)
        properties_1.checkProperties(transaction.value, allowedTransactionValueKeys);
}
function serialize(unsignedTransaction, signature, publicKey) {
    checkTransaction(unsignedTransaction);
    if (!signature) {
        return base64_1.encode(utf8_1.toUtf8Bytes(JSON.stringify(unsignedTransaction)));
    }
    if (!unsignedTransaction.value)
        return errors.throwError('invalid unsigned transaction', errors.INVALID_ARGUMENT, { arg: 'unsignedTransaction', value: unsignedTransaction });
    let transaction = {};
    transactionFields.forEach(function (fieldInfo) {
        let value = unsignedTransaction[fieldInfo.name] || ([]);
        // Fixed-width field
        if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
            errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
        }
        // Variable-width (with a maximum)
        if (fieldInfo.maxLength) {
            value = bytes_1.stripZeros(value);
            if (value.length > fieldInfo.maxLength) {
                errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
            }
        }
        transaction[fieldInfo.name] = 'object' === typeof value ? properties_1.shallowCopy(value) : value;
    });
    if (!transaction.value.signatures)
        transaction.value.signatures = [];
    transaction.value.signatures.push({
        // Have to match the endpoint defined naming convention
        pub_key: {
            type: "tendermint/PubKeySecp256k1",
            value: base64_1.encode(publicKey)
        },
        signature: bytes_1.isArrayish(signature) ? signature : base64_1.encode(bytes_1.joinSignature(signature))
    });
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
    return base64_1.encode(utf8_1.toUtf8Bytes(JSON.stringify(transaction)));
}
exports.serialize = serialize;
function parse(rawTransaction) {
    let tx = {};
    if ("string" === typeof rawTransaction) {
        try {
            tx.hash = sha2_1.sha256(rawTransaction);
            rawTransaction = utf8_1.toUtf8String(base64_1.decode(rawTransaction));
            rawTransaction = JSON.parse(rawTransaction);
        }
        catch (error) {
            errors.throwError('invalid raw transaction', errors.INVALID_ARGUMENT, { arg: 'rawTransactin', value: rawTransaction });
        }
    }
    checkTransaction(rawTransaction);
    if (rawTransaction.type) {
        tx.type = rawTransaction.type;
        tx.value = rawTransaction.value;
    }
    else {
        if (!rawTransaction.check_tx) {
            tx.checkTransaction = {
                gasWanted: handleBigNumber(rawTransaction.check_tx.gasWanted),
                gasUsed: handleBigNumber(rawTransaction.check_tx.gasUsed)
            };
        }
        if (!rawTransaction.deliver_tx) {
            tx.deliverTransaction = {
                log: rawTransaction.deliver_tx.log,
                gasWanted: handleBigNumber(rawTransaction.deliver_tx.gasWanted),
                gasUsed: handleBigNumber(rawTransaction.deliver_tx.gasUsed),
                tags: []
            };
            if (!rawTransaction.deliver_tx.tags) {
                for (let tag of rawTransaction.deliver_tx.tags) {
                    tx.deliverTransaction.tags.push({
                        key: tag.key,
                        value: tag.value
                    });
                }
            }
        }
        tx.hash = rawTransaction.hash;
        tx.blockNumber = handleNumber(rawTransaction.height);
    }
    return tx;
}
exports.parse = parse;
function populateTransaction(transaction, provider, from) {
    if (!abstract_provider_1.Provider.isProvider(provider)) {
        errors.throwError('missing provider', errors.INVALID_ARGUMENT, {
            argument: 'provider',
            value: provider
        });
    }
    checkTransaction(transaction);
    let tx = properties_1.shallowCopy(transaction);
    if (null == tx.fee) {
        errors.throwError("missing fee", errors.MISSING_FEES, {});
    }
    if (null == tx.nonce) {
        tx.nonce = provider.getTransactionCount(from);
    }
    if (null == tx.chainId) {
        tx.chainId = provider.getNetwork().then((network) => network.chainId);
    }
    return properties_1.resolveProperties(tx);
}
exports.populateTransaction = populateTransaction;
function getTransactionRequest(route, transactionType, overrides) {
    let transaction;
    let moduleName = route + "/" + transactionType;
    switch (moduleName) {
        case "bank/bank-send":
            {
                let params = misc_1.checkFormat({
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString),
                    denom: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "mxw/msgSend",
                                value: {
                                    amount: [
                                        {
                                            amount: params.value.toString(),
                                            denom: params.denom ? params.denom : units_1.smallestUnitName,
                                        },
                                    ],
                                    from_address: params.from,
                                    to_address: params.to,
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "kyc/kyc-whitelist":
            {
                let params = misc_1.checkFormat({
                    kycData: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "kyc/whitelist",
                                value: {
                                    kycData: params.kycData,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "kyc/kyc-revokeWhitelist":
            {
                let params = misc_1.checkFormat({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "kyc/revokeWhitelist",
                                value: {
                                    payload: params.payload,
                                    signatures: params.signatures,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "kyc/kyc-bind":
            {
                let params = misc_1.checkFormat({
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    kycAddress: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "kyc/kycBind",
                                value: {
                                    from: params.from,
                                    kycAddress: params.kycAddress,
                                    to: params.to
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "kyc/kyc-unbind":
            {
                let params = misc_1.checkFormat({
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    kycAddress: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "kyc/kycUnbind",
                                value: {
                                    from: params.from,
                                    kycAddress: params.kycAddress,
                                    to: params.to
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nameservice/nameservice-setAliasStatus":
            {
                let params = misc_1.checkFormat({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nameservice/setAliasStatus",
                                value: {
                                    payload: params.payload,
                                    signatures: params.signatures,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nameservice/nameservice-createAlias":
            {
                let params = misc_1.checkFormat({
                    appFeeTo: misc_1.checkString,
                    appFeeValue: misc_1.checkBigNumber,
                    name: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nameservice/createAlias",
                                value: {
                                    fee: {
                                        to: params.appFeeTo,
                                        value: params.appFeeValue.toString()
                                    },
                                    name: params.name,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-createFungibleToken":
            {
                let params = misc_1.checkFormat({
                    appFeeTo: misc_1.checkString,
                    appFeeValue: misc_1.checkBigNumber,
                    name: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString),
                    decimals: misc_1.checkNumber,
                    fixedSupply: misc_1.checkBoolean,
                    metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                    symbol: misc_1.checkString,
                    maxSupply: misc_1.checkBigNumber
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/createFungibleToken",
                                value: {
                                    decimals: params.decimals.toString(),
                                    fee: {
                                        to: params.appFeeTo,
                                        value: params.appFeeValue.toString()
                                    },
                                    fixedSupply: params.fixedSupply,
                                    metadata: params.metadata ? params.metadata : "",
                                    name: params.name,
                                    owner: params.owner,
                                    symbol: params.symbol,
                                    maxSupply: params.maxSupply.toString()
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-setFungibleTokenStatus":
            {
                let params = misc_1.checkFormat({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/setFungibleTokenStatus",
                                value: {
                                    payload: params.payload,
                                    signatures: params.signatures,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-setFungibleTokenAccountStatus":
            {
                let params = misc_1.checkFormat({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/setFungibleTokenAccountStatus",
                                value: {
                                    payload: params.payload,
                                    signatures: params.signatures,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-transferFungibleToken":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/transferFungibleToken",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    to: params.to,
                                    value: params.value.toString()
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-mintFungibleToken":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/mintFungibleToken",
                                value: {
                                    symbol: params.symbol,
                                    owner: params.owner,
                                    to: params.to,
                                    value: params.value.toString()
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-burnFungibleToken":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/burnFungibleToken",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    value: params.value.toString()
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-freezeFungibleToken":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    target: misc_1.checkAddress,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/freezeFungibleToken",
                                value: {
                                    symbol: params.symbol,
                                    target: params.target,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-unfreezeFungibleToken":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    target: misc_1.checkAddress,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/unfreezeFungibleToken",
                                value: {
                                    symbol: params.symbol,
                                    target: params.target,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-transferFungibleTokenOwnership":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/transferFungibleTokenOwnership",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    to: params.to
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "token/token-acceptFungibleTokenOwnership":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "token/acceptFungibleTokenOwnership",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/createNonFungibleToken":
            {
                let params = misc_1.checkFormat({
                    appFeeTo: misc_1.checkString,
                    appFeeValue: misc_1.checkBigNumber,
                    name: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString),
                    metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                    properties: misc_1.allowNullOrEmpty(misc_1.checkString),
                    symbol: misc_1.checkString,
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/createNonFungibleToken",
                                value: {
                                    fee: {
                                        to: params.appFeeTo,
                                        value: params.appFeeValue.toString()
                                    },
                                    metadata: params.metadata ? params.metadata : "",
                                    properties: params.properties ? params.properties : "",
                                    name: params.name,
                                    owner: params.owner,
                                    symbol: params.symbol,
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/setNonFungibleTokenStatus":
            {
                let params = misc_1.checkFormat({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/setNonFungibleTokenStatus",
                                value: {
                                    payload: params.payload,
                                    signatures: params.signatures,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/mintNonFungibleItem":
            {
                let params = misc_1.checkFormat({
                    itemID: misc_1.checkString,
                    symbol: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                    properties: misc_1.allowNullOrEmpty(misc_1.checkString),
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString),
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/mintNonFungibleItem",
                                value: {
                                    itemID: params.itemID,
                                    symbol: params.symbol,
                                    owner: params.owner,
                                    to: params.to,
                                    properties: params.properties ? params.properties : "",
                                    metadata: params.metadata ? params.metadata : ""
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/transferNonFungibleItem":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkString,
                    to: misc_1.checkString,
                    itemID: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/transferNonFungibleItem",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    to: params.to,
                                    itemID: params.itemID
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/transferNonFungibleTokenOwnership":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkString,
                    to: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/transferNonFungibleTokenOwnership",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    to: params.to,
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/burnNonFungibleItem":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/burnNonFungibleItem",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    itemID: params.itemID
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/endorsement":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/endorsement",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    itemID: params.itemID
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/setNonFungibleItemStatus":
            {
                let params = misc_1.checkFormat({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/setNonFungibleItemStatus",
                                value: {
                                    payload: params.payload,
                                    signatures: params.signatures,
                                    owner: params.owner
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/updateItemMetadata":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/updateItemMetadata",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    itemID: params.itemID,
                                    metadata: params.metadata ? params.metadata : ""
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/acceptNonFungibleTokenOwnership":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/acceptNonFungibleTokenOwnership",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/updateNFTMetadata":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    metadata: misc_1.allowNullOrEmpty(misc_1.checkString),
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/updateNFTMetadata",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    metadata: params.metadata ? params.metadata : ""
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        case "nonFungible/burnNonFungibleToken":
            {
                let params = misc_1.checkFormat({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    memo: misc_1.allowNullOrEmpty(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/burnNonFungibleToken",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    itemID: params.itemID,
                                }
                            }
                        ],
                        memo: params.memo ? params.memo : ""
                    },
                    fee: null
                };
            }
            break;
        default:
            errors.throwError("Not implemented: " + moduleName, errors.NOT_IMPLEMENTED, { route, transactionType, overrides });
    }
    return transaction;
}
exports.getTransactionRequest = getTransactionRequest;
//# sourceMappingURL=transaction.js.map