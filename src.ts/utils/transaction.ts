
import { Zero } from '../constants';

import * as errors from '../errors';

import { BigNumber, bigNumberify } from './bignumber';
import { stripZeros, joinSignature, isArrayish } from './bytes';
import { checkProperties, resolveProperties, shallowCopy } from './properties';
import { encode as base64Encode, decode as base64Decode } from './base64';
import { toUtf8Bytes, toUtf8String } from './utf8';

///////////////////////////////
// Imported Types

import { Arrayish, Signature } from './bytes';
import { BigNumberish } from './bignumber';

import { Provider, TransactionFee, TransactionRequest } from '../providers/abstract-provider';
import { sha256 } from './sha2';
import { sortObject, iterate, checkFormat, checkAddress, checkBigNumber, allowNullOrEmpty, checkString, checkAny, checkNumber, checkBoolean } from './misc';
import { smallestUnitName } from './units';

///////////////////////////////
// Exported Types

export type UnsignedTransaction = {
    type?: string,
    value?: {
        msg?: Array<{ type: string, value: any }>,
        fee?: {
            amount?: Array<{ denom: string, amount: BigNumberish }>,
            gas: BigNumberish
        },
        memo?: string
    }
}

export interface Transaction {
    type?: string,
    value?: {
        fee?: TransactionFee | Promise<TransactionFee>,
        memo?: string,
        msg?: Array<{ type: string, value: any }>,
        signatures?: Array<
            {
                publicKey: {
                    type: string,
                    value: string
                },
                signature: string
            }
        >
    }
    fee?: TransactionFee | Promise<TransactionFee>,
    checkTransaction?: {
        gasWanted?: BigNumberish;
        gasUsed?: BigNumberish;
    }
    deliverTransaction?: {
        log?: TransactionLog | string;
        gasWanted?: BigNumberish;
        gasUsed?: BigNumberish
        tags?: Array<{ key: string; value: string }>
    }
    hash?: string;
    blockNumber?: number;
}

export interface TransactionLog {
    success: boolean,
    info: {
        nonce: BigNumberish,
        hash: string,
        message?: string
    }
}

///////////////////////////////

// function handleAddress(value: string): string {
//     if (value === '0x') { return null; }
//     return getAddress(value);
// }

function handleNumber(value: string): number {
    if (value === '0x') { return bigNumberify(value).toNumber(); }
    return parseInt(value);
}

function handleBigNumber(value: string): BigNumber {
    if (value === '0x') { return Zero; }
    return bigNumberify(value);
}

const transactionFields: Array<{ name: string, length?: number, maxLength?: number }> = [
    { name: 'type' }, { name: 'value' }
];

const allowedTransactionKeys: { [key: string]: boolean } = {
    type: true, value: true, nonce: true, chainId: true, fee: true,
    check_tx: true, deliver_tx: true, hash: true, height: true, accountNumber: true
}

const allowedTransactionValueKeys: { [key: string]: boolean } = {
    type: true, msg: true, fee: true, signatures: true, memo: true
}

function checkTransaction(transaction: any): void {
    checkProperties(transaction, allowedTransactionKeys);
    if (transaction.value)
        checkProperties(transaction.value, allowedTransactionValueKeys);
}

export function serialize(unsignedTransaction: UnsignedTransaction, signature?: Arrayish | Signature, publicKey?: string): string {
    checkTransaction(unsignedTransaction);

    if (!signature) { return base64Encode(toUtf8Bytes(JSON.stringify(unsignedTransaction))); }

    if (!unsignedTransaction.value)
        return errors.throwError('invalid unsigned transaction', errors.INVALID_ARGUMENT, { arg: 'unsignedTransaction', value: unsignedTransaction });

    let transaction: Transaction = {};

    transactionFields.forEach(function (fieldInfo) {
        let value = (<any>unsignedTransaction)[fieldInfo.name] || ([]);

        // Fixed-width field
        if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
            errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
        }

        // Variable-width (with a maximum)
        if (fieldInfo.maxLength) {
            value = stripZeros(value);
            if (value.length > fieldInfo.maxLength) {
                errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
            }
        }

        transaction[fieldInfo.name] = 'object' === typeof value ? shallowCopy(value) : value;
    });

    if (!transaction.value.signatures)
        transaction.value.signatures = [];

    transaction.value.signatures.push(<any>{
        // Have to match the endpoint defined naming convention
        pub_key: {
            type: "tendermint/PubKeySecp256k1",
            value: base64Encode(publicKey)
        },
        signature: isArrayish(signature) ? signature : base64Encode(joinSignature(signature))
    });

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

    return base64Encode(toUtf8Bytes(JSON.stringify(transaction)));
}

export function parse(rawTransaction: any): Transaction {
    let tx: Transaction = {};

    if ("string" === typeof rawTransaction) {
        try {
            tx.hash = sha256(rawTransaction);
            rawTransaction = toUtf8String(base64Decode(rawTransaction));
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
            }
        }

        if (!rawTransaction.deliver_tx) {
            tx.deliverTransaction = {
                log: rawTransaction.deliver_tx.log,
                gasWanted: handleBigNumber(rawTransaction.deliver_tx.gasWanted),
                gasUsed: handleBigNumber(rawTransaction.deliver_tx.gasUsed),
                tags: []
            }

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

export function populateTransaction(transaction: any, provider: Provider, from: string | Promise<string>): Promise<Transaction> {
    if (!Provider.isProvider(provider)) {
        errors.throwError('missing provider', errors.INVALID_ARGUMENT, {
            argument: 'provider',
            value: provider
        });
    }

    checkTransaction(transaction);

    let tx = shallowCopy(transaction);

    if (null == tx.fee) {
        errors.throwError("missing fee", errors.MISSING_FEES, {});
    }
    if (null == tx.nonce) {
        tx.nonce = provider.getTransactionCount(from);
    }
    if (null == tx.chainId) {
        tx.chainId = provider.getNetwork().then((network) => network.chainId);
    }

    return resolveProperties(tx);
}

export function getTransactionRequest(route: string, transactionType: string, overrides?: any) {
    let transaction: TransactionRequest;

    let moduleName = route + "/" + transactionType;
    switch (moduleName) {
        case "bank/bank-send":
            {
                let params: {
                    from: string,
                    to: string,
                    value: BigNumberish,
                    memo: string,
                    denom: string
                } = checkFormat({
                    from: checkAddress,
                    to: checkAddress,
                    value: checkBigNumber,
                    memo: allowNullOrEmpty(checkString),
                    denom: allowNullOrEmpty(checkString)
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
                                            denom: params.denom ? params.denom : smallestUnitName,
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
                let params: {
                    kycData: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    kycData: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    payload: any,
                    signatures: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    payload: checkAny,
                    signatures: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    from: string,
                    to: string,
                    kycAddress: string,
                    memo: string
                } = checkFormat({
                    from: checkAddress,
                    to: checkAddress,
                    kycAddress: checkString,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    from: string,
                    to: string,
                    kycAddress: string,
                    memo: string
                } = checkFormat({
                    from: checkAddress,
                    to: checkAddress,
                    kycAddress: checkString,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    payload: any,
                    signatures: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    payload: checkAny,
                    signatures: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    appFeeTo: string,
                    appFeeValue: BigNumberish,
                    name: string,
                    owner: string,
                    memo: string
                } = checkFormat({
                    appFeeTo: checkString,
                    appFeeValue: checkBigNumber,
                    name: checkString,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    appFeeTo: string,
                    appFeeValue: BigNumberish,
                    name: string,
                    owner: string,
                    memo: string,
                    decimals: number,
                    fixedSupply: boolean,
                    metadata: string,
                    symbol: string,
                    maxSupply: BigNumberish
                } = checkFormat({
                    appFeeTo: checkString,
                    appFeeValue: checkBigNumber,
                    name: checkString,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString),
                    decimals: checkNumber,
                    fixedSupply: checkBoolean,
                    metadata: allowNullOrEmpty(checkString),
                    symbol: checkString,
                    maxSupply: checkBigNumber
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
                let params: {
                    payload: any,
                    signatures: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    payload: checkAny,
                    signatures: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    payload: any,
                    signatures: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    payload: checkAny,
                    signatures: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    to: string,
                    value: BigNumber,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    to: checkAddress,
                    value: checkBigNumber,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    owner: string,
                    to: string,
                    value: BigNumber,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    owner: checkAddress,
                    to: checkAddress,
                    value: checkBigNumber,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    value: BigNumber,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    value: checkBigNumber,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    target: string,
                    owner: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    target: checkAddress,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    target: string,
                    owner: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    target: checkAddress,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    to: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    to: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    appFeeTo: string,
                    appFeeValue: BigNumberish,
                    name: string,
                    owner: string,
                    memo: string,
                    metadata: string,
                    properties: string,
                    symbol: string,
                } = checkFormat({
                    appFeeTo: checkString,
                    appFeeValue: checkBigNumber,
                    name: checkString,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString),
                    metadata: allowNullOrEmpty(checkString),
                    properties: allowNullOrEmpty(checkString),
                    symbol: checkString,
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
                let params: {
                    payload: any,
                    signatures: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    payload: checkAny,
                    signatures: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    itemID: string
                    symbol: string
                    owner: string
                    to: string
                    memo: string
                    properties: string
                    metadata: string
                } = checkFormat({
                    itemID: checkString,
                    symbol: checkString,
                    owner: checkAddress,
                    to: checkAddress,
                    metadata: allowNullOrEmpty(checkString),
                    properties: allowNullOrEmpty(checkString),
                    memo: allowNullOrEmpty(checkString),
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
                let params: {
                    symbol: string,
                    from: string,
                    to: string,
                    itemID: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkString,
                    to: checkString,
                    itemID: checkString,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    to: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkString,
                    to: checkString,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    itemID: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    itemID: checkString,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    itemID: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    itemID: checkString,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    payload: any,
                    signatures: any,
                    owner: string,
                    memo: string
                } = checkFormat({
                    payload: checkAny,
                    signatures: checkAny,
                    owner: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    itemID: string,
                    metadata: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    itemID: checkString,
                    metadata: allowNullOrEmpty(checkString),
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    memo: allowNullOrEmpty(checkString)
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
                let params: {
                    symbol: string,
                    from: string,
                    metadata: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    metadata: allowNullOrEmpty(checkString),
                    memo: allowNullOrEmpty(checkString)
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

                }
            }
            break;

        case "nonFungible/burnNonFungibleToken":
            {
                let params: {
                    symbol: string,
                    from: string,
                    itemID: string,
                    memo: string
                } = checkFormat({
                    symbol: checkString,
                    from: checkAddress,
                    itemID: checkString,
                    memo: allowNullOrEmpty(checkString)
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

                }
            }
            break;

        default:
            errors.throwError("Not implemented: " + moduleName, errors.NOT_IMPLEMENTED, { route, transactionType, overrides });
    }
    return transaction;
}