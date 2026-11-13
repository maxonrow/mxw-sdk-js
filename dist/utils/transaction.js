"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = serialize;
exports.parse = parse;
exports.populateTransaction = populateTransaction;
exports.getTransactionRequest = getTransactionRequest;
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
        return (0, bignumber_1.bigNumberify)(value).toNumber();
    }
    return parseInt(value);
}
function handleBigNumber(value) {
    if (value === '0x') {
        return constants_1.Zero;
    }
    return (0, bignumber_1.bigNumberify)(value);
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
    (0, properties_1.checkProperties)(transaction, allowedTransactionKeys);
    if (transaction.value)
        (0, properties_1.checkProperties)(transaction.value, allowedTransactionValueKeys);
}
function serialize(unsignedTransaction, signature, publicKey) {
    checkTransaction(unsignedTransaction);
    if (!signature) {
        return (0, base64_1.encode)((0, utf8_1.toUtf8Bytes)(JSON.stringify(unsignedTransaction)));
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
            value = (0, bytes_1.stripZeros)(value);
            if (value.length > fieldInfo.maxLength) {
                errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
            }
        }
        transaction[fieldInfo.name] = 'object' === typeof value ? (0, properties_1.shallowCopy)(value) : value;
    });
    if (!transaction.value.signatures)
        transaction.value.signatures = [];
    transaction.value.signatures.push({
        // Have to match the endpoint defined naming convention
        pub_key: {
            type: "tendermint/PubKeySecp256k1",
            value: (0, base64_1.encode)(publicKey)
        },
        signature: (0, bytes_1.isArrayish)(signature) ? signature : (0, base64_1.encode)((0, bytes_1.joinSignature)(signature))
    });
    // Convert number and big number to string
    transaction = (0, misc_1.iterate)(transaction, function (key, value, type) {
        switch (type) {
            case "Number":
            case "BigNumber":
                return value.toString();
        }
        return value;
    });
    transaction = (0, misc_1.sortObject)(transaction);
    return (0, base64_1.encode)((0, utf8_1.toUtf8Bytes)(JSON.stringify(transaction)));
}
function parse(rawTransaction) {
    let tx = {};
    if ("string" === typeof rawTransaction) {
        try {
            tx.hash = (0, sha2_1.sha256)(rawTransaction);
            rawTransaction = (0, utf8_1.toUtf8String)((0, base64_1.decode)(rawTransaction));
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
function populateTransaction(transaction, provider, from) {
    if (!abstract_provider_1.Provider.isProvider(provider)) {
        errors.throwError('missing provider', errors.INVALID_ARGUMENT, {
            argument: 'provider',
            value: provider
        });
    }
    checkTransaction(transaction);
    let tx = (0, properties_1.shallowCopy)(transaction);
    if (null == tx.fee) {
        errors.throwError("missing fee", errors.MISSING_FEES, {});
    }
    if (null == tx.nonce) {
        tx.nonce = provider.getTransactionCount(from);
    }
    if (null == tx.chainId) {
        tx.chainId = provider.getNetwork().then((network) => network.chainId);
    }
    return (0, properties_1.resolveProperties)(tx);
}
function getTransactionRequest(route, transactionType, overrides) {
    let transaction;
    let moduleName = route + "/" + transactionType;
    switch (moduleName) {
        case "bank/bank-send":
            {
                let params = (0, misc_1.checkFormat)({
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    denom: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    kycData: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    kycAddress: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    kycAddress: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    appFeeTo: misc_1.checkString,
                    appFeeValue: misc_1.checkBigNumber,
                    name: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    appFeeTo: misc_1.checkString,
                    appFeeValue: misc_1.checkBigNumber,
                    name: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    decimals: misc_1.checkNumber,
                    fixedSupply: misc_1.checkBoolean,
                    metadata: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
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
                let params = (0, misc_1.checkFormat)({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    value: misc_1.checkBigNumber,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    target: misc_1.checkAddress,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    target: misc_1.checkAddress,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    appFeeTo: misc_1.checkString,
                    appFeeValue: misc_1.checkBigNumber,
                    name: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    metadata: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    properties: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
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
                let params = (0, misc_1.checkFormat)({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    itemID: misc_1.checkString,
                    symbol: misc_1.checkString,
                    owner: misc_1.checkAddress,
                    to: misc_1.checkAddress,
                    metadata: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    properties: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkString,
                    to: misc_1.checkString,
                    itemID: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkString,
                    to: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    metadata: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                                    itemID: params.itemID,
                                    metadata: params.metadata
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
                let params = (0, misc_1.checkFormat)({
                    payload: misc_1.checkAny,
                    signatures: misc_1.checkAny,
                    owner: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    metadata: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    metadata: (0, misc_1.allowNullOrEmpty)(misc_1.checkString),
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
        case "nonFungible/updateNFTEndorserList":
            {
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    endorsers: (0, misc_1.allowNullOrEmpty)((0, misc_1.arrayOf)(misc_1.checkAddress), null),
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
                }, overrides);
                transaction = {
                    type: "cosmos-sdk/StdTx",
                    value: {
                        msg: [
                            {
                                type: "nonFungible/updateNFTEndorserList",
                                value: {
                                    symbol: params.symbol,
                                    from: params.from,
                                    endorsers: params.endorsers
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
                let params = (0, misc_1.checkFormat)({
                    symbol: misc_1.checkString,
                    from: misc_1.checkAddress,
                    itemID: misc_1.checkString,
                    memo: (0, misc_1.allowNullOrEmpty)(misc_1.checkString)
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
//# sourceMappingURL=transaction.js.map