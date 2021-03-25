'use strict';

import { getAddress } from '../utils/address';
import { BigNumber, bigNumberify } from '../utils/bignumber';
import { hexDataLength, isHexString } from '../utils/bytes';
import { getNetwork } from '../utils/networks';
import { defineReadOnly, inheritable, resolveProperties, camelize } from '../utils/properties';
import { parse as parseTransaction, TransactionLog, getTransactionRequest } from '../utils/transaction';
import { poll } from '../utils/web';
import { encode as base64Encode, decode as base64Decode } from '../utils/base64';
import {
    checkFormat, allowNullOrEmpty, arrayOf, checkHash, checkAddress, checkNumber, checkBigNumber, checkBoolean,
    checkString, checkTimestamp, checkHex, checkHexAddress, checkAny, iterate, sortObject, isUndefinedOrNullOrEmpty
} from '../utils/misc';
import { toUtf8String, toUtf8Bytes, computeAddress } from '../utils';
import { TransactionRequest } from '.';
import { ValOperatorAddressPrefix } from '../constants';

import * as errors from '../errors';

///////////////////////////////
// Imported Abstracts
import { Provider, TransactionEvent, Status, DeliverTransaction, TransactionFeeSetting, KeyValue, TypeAttribute } from './abstract-provider';


///////////////////////////////
// Imported Types

import {
    Block, BlockTag, BlockInfo,
    EventType,
    Listener,
    AccountState,
    AliasState,
    TokenState, NFTokenState, NFTokenItemState, TokenList, TokenAccountState,
    TransactionReceipt, TransactionResponse, TransactionFee
} from './abstract-provider';

import { Transaction } from '../utils/transaction';
import { Network, Networkish } from '../utils/networks';

//////////////////////////////
// Request and Response Checking

function checkKeyValue(data: any): KeyValue {
    return checkFormat({
        key: checkString,
        value: allowNullOrEmpty(checkString, null)
    }, data);
}

function checkTypeAttribute(data: any): TypeAttribute {
    return checkFormat({
        type: checkString,
        attributes: allowNullOrEmpty(arrayOf(checkKeyValue))
    }, data);
}

function checkAliasState(data: any): AliasState {
    return camelize(checkFormat({
        Name: checkString,
        Approved: checkBoolean,
        Owner: checkString,
        Metadata: checkString,
        Fee: checkBigNumber
    }, data), (key) => {
        switch (key) {
            case "Name": return "name";
            case "Owner": return "owner";
            case "Metadata": return "metadata";
            case "Approved": return "approved";
            case "Fee": return "fee";
        }
        return key;
    });
}

function checkTokenState(data: any): TokenState {
    return camelize(checkFormat({
        Flags: checkNumber,
        Name: checkString,
        Symbol: checkString,
        Decimals: checkNumber,
        TotalSupply: checkBigNumber,
        MaxSupply: checkBigNumber,
        Owner: checkString,
        NewOwner: checkString,
        Metadata: checkString
    }, data), (key) => {
        switch (key) {
            case "Flags": return "flags";
            case "Name": return "name";
            case "Symbol": return "symbol";
            case "Decimals": return "decimals";
            case "Owner": return "owner";
            case "NewOwner": return "newOwner";
            case "Metadata": return "metadata";
            case "TotalSupply": return "totalSupply";
            case "MaxSupply": return "maxSupply";
        }
        return key;
    });
}

function checkNonFungibleTokenState(data: any): NFTokenState {
    return camelize(checkFormat({
        Flags: checkNumber,
        Name: checkString,
        Symbol: checkString,
        Owner: checkAddress,
        NewOwner: checkAddress,
        Metadata: allowNullOrEmpty(checkString),
        Properties: allowNullOrEmpty(checkString),
        TransferLimit: checkBigNumber,
        MintLimit: checkBigNumber,
        TotalSupply: checkBigNumber,
        EndorserList: allowNullOrEmpty(arrayOf(checkAddress), []),
        EndorserListLimit: checkBigNumber
    }, data), (key) => {
        switch (key) {
            case "Flags": return "flags";
            case "Name": return "name";
            case "Symbol": return "symbol";
            case "Owner": return "owner";
            case "NewOwner": return "newOwner";
            case "Metadata": return "metadata";
            case "Properties": return "properties";
            case "TransferLimit": return "transferLimit";
            case "MintLimit": return "mintLimit";
            case "TotalSupply": return "totalSupply";
            case "EndorserList": return "endorserList";
            case "EndorserListLimit": return "endorserListLimit";
        }
        return key;
    });
}

function checkNonFungibleTokenItemState(data: any): NFTokenItemState {
    return camelize(checkFormat({
        Owner: allowNullOrEmpty(checkString),
        ID: checkString,
        Metadata: allowNullOrEmpty(checkString),
        Properties: allowNullOrEmpty(checkString),
        Frozen: checkBoolean,
        TransferLimit: checkBigNumber
    }, data), (key) => {
        switch (key) {
            case "Owner": return "owner";
            case "ID": return "id";
            case "Metadata": return "metadata";
            case "Properties": return "properties";
            case "Frozen": return "frozen";
            case "TransferLimit": return "transferLimit";
        }
        return key;
    });
}

function checkTokenAccountState(data: any): TokenAccountState {
    return camelize(checkFormat({
        Owner: checkString,
        Frozen: checkBoolean,
        Balance: checkBigNumber
    }, data), (key) => {
        switch (key) {
            case "Owner": return "owner";
            case "Frozen": return "frozen";
            case "Balance": return "balance";
        }
        return key;
    });
}

function checkStatus(data: any): Status {
    return camelize(checkFormat({
        node_info: {
            protocol_version: {
                p2p: checkNumber,
                block: checkNumber,
                app: checkNumber
            },
            id: checkHex,
            listen_addr: checkString,
            network: checkString,
            version: checkString,
            channels: checkNumber,
            moniker: checkString,
            other: {
                tx_index: checkString,
                rpc_address: checkString
            }
        },
        sync_info: {
            latest_block_hash: checkHash,
            latest_app_hash: checkHash,
            latest_block_height: checkNumber,
            latest_block_time: checkTimestamp,
            catching_up: checkBoolean
        },
        validator_info: {
            address: checkHexAddress,
            pub_key: {
                type: checkString,
                value: checkString
            },
            voting_power: checkNumber
        }
    }, data), (key) => {
        switch (key) {
            case "listenAddr": return "listenAddress";
            case "latestBlockHeight": return "latestBlockNumber";
        }
        return key;
    });
}

function checkTransactionFee(fee: any): TransactionFee {
    return camelize(checkFormat({
        amount: arrayOf(checkTransactionFeeAmount),
        gas: checkBigNumber
    }, fee));
}

function checkTransactionFeeAmount(amount: any): TransactionFee {
    return camelize(checkFormat({
        amount: checkBigNumber,
        denom: checkString
    }, amount));
}

function checkBlock(data: any): Block {
    let block: Block = camelize(checkFormat({
        height: checkNumber,
        results: {
            deliver_tx: allowNullOrEmpty(arrayOf(checkDeliverTransaction))
        }
    }, data), (key) => {
        switch (key) {
            case "height": return "blockNumber";
            case "deliverTx": return "transactions";
            case "key": return "address";
            case "value": return "event";
        }
        return key;
    });

    if (!block.results.transactions || !Array.isArray(block.results.transactions)) {
        block.results.transactions = [];
    }
    else {
        let transactionIndex = 0;
        for (let i = 0; i < block.results.transactions.length; i++) {
            let transaction = block.results.transactions[i];

            if (!transaction) {
                // Remove any empty transaction
                block.results.transactions.splice(i--, 1);
                continue;
            }

            transaction.transactionIndex = transactionIndex++;

            let events: TransactionEvent[] = [];

            if (transaction.events && Array.isArray(transaction.events)) {
                let index = 0;
                for (let event of transaction.events) {
                    if (event.hash) {
                        event.transactionIndex = transaction.transactionIndex;
                        event.eventIndex = index++;
                        events.push(event);
                    }
                }
            }
            transaction.events = events;
        }
    }
    return camelize(block);
}

function checkBlockInfo(data: any): BlockInfo {
    data = camelize(checkFormat({
        block: {
            header: {
                height: checkNumber,
                time: checkTimestamp,
                total_txs: checkNumber,
                proposer_address: checkString
            }
        }
    }, data), (key) => {
        switch (key) {
            case "height": return "blockNumber";
            case "time": return "blockTime";
            case "totalTxs": return "totalTransactions";
        }
        return key;
    });

    if (data.block && data.block.header) {
        data.block.header.proposerAddress = computeAddress(data.block.header.proposerAddress, ValOperatorAddressPrefix);
        return {
            ...data.block.header
        }
    }
    return undefined;
}

function checkDeliverTransaction(value: any): DeliverTransaction {
    let transaction = camelize(checkFormat({
        log: allowNullOrEmpty(checkString),
        events: checkTransactionEvents
    }, value), (key) => {
        switch (key) {
            case "log": return "logs";
        }
        return key;
    });

    try {
        let logs = JSON.parse(transaction.logs as string);
        transaction.logs = [];
        if (Array.isArray(logs)) {
            for (let log of logs) {
                transaction.logs.push(checkTransactionLog(log));
            }
            if (0 < transaction.logs.length) {
                let log: TransactionLog = transaction.logs[0] as TransactionLog;

                if (log && log.info && 0 <= log.info.nonce) {
                    transaction.nonce = log.info.nonce;
                    log.info.nonce = undefined; // remove it from redundant data
                }

                if (log && log.info && log.info.hash) {
                    transaction.hash = log.info.hash;
                    log.info.hash = undefined; // remove it from redundant data
                }
            }
        }
    }
    catch (error) { }

    if (!transaction.hash) {
        return undefined; // Discard failed transaction
    }
    return transaction;
}

function checkTransactionEvent(data: any): TransactionEvent {
    let kv = checkKeyValue(data);
    if ("string" === typeof kv.value) {
        kv.value = JSON.parse(toUtf8String(base64Decode(kv.value)));
    }

    let event: TransactionEvent = camelize(checkFormat({
        hash: checkString,
        params: allowNullOrEmpty(arrayOf(checkString))
    }, kv.value));
    event.address = checkAddress(toUtf8String(base64Decode(kv.key)));
    event.hash = "0x" + event.hash;
    return event;
}

function checkTransactionEvents(data: any): any {
    let groups: TypeAttribute[] = allowNullOrEmpty(arrayOf(checkTypeAttribute))(data);
    let events: TransactionEvent[] = [];

    if (groups && Array.isArray(groups)) {
        for (let group of groups) {
            // Only support system events for the time being
            if ("system" == group.type) {
                for (let attribute of group.attributes) {
                    let event = checkTransactionEvent(attribute);
                    events.push(event);
                }
            }
        }
    }
    return events;
}

function checkTransactionReceipt(transaction: any): TransactionReceipt {
    let receipt: TransactionReceipt = camelize(checkFormat({
        hash: checkHash,
        height: checkNumber,
        status: checkNumber,
        index: checkNumber,
        tx_result: {
            log: checkString,
            events: checkTransactionEvents
        },
        tx: checkString
    }, transaction), (key) => {
        switch (key) {
            case "txResult": return "result";
            case "tx": return "payload";
            case "height": return "blockNumber";
            case "log": return "logs";
            case "key": return "address";
            case "value": return "event";
        }
        return key;
    });
    if (receipt.result) {
        let events: TransactionEvent[] = [];

        if (receipt.result.events && Array.isArray(receipt.result.events)) {
            let index = 0;
            for (let event of receipt.result.events) {
                if (event.hash) {
                    event.transactionIndex = 0;
                    event.eventIndex = index++;
                    events.push(event);
                }
            }
        }
        receipt.result.events = events;

        if (receipt.result.logs) {
            try {
                let logs = JSON.parse(receipt.result.logs as string);
                receipt.result.logs = [];
                if (Array.isArray(logs)) {
                    for (let log of logs) {
                        receipt.result.logs.push(checkTransactionLog(log));
                    }
                    if (0 < receipt.result.logs.length) {
                        let log: TransactionLog = receipt.result.logs[0] as TransactionLog;

                        if (log && log.info && 0 <= log.info.nonce) {
                            receipt.nonce = log.info.nonce;
                            log.info.nonce = undefined; // remove it from redundant data
                        }

                        if (log && log.info && log.info.hash) {
                            receipt.hash = log.info.hash;
                            log.info.hash = undefined; // remove it from redundant data
                        }
                    }
                }
            }
            catch (error) { receipt.result.logs = undefined; }
        }
    }
    if (receipt.payload) {
        try {
            receipt.payload = JSON.parse(receipt.payload);
        }
        catch (error) {
        }
    }

    if (!receipt.hash) {
        return undefined; // Discard failed transaction
    }
    return camelize(receipt);
}

function checkTransactionLog(data: any): TransactionLog {
    if ("string" === typeof data) {
        data = JSON.parse(data);
    }
    let log: TransactionLog = camelize(checkFormat({
        success: checkBoolean,
        log: checkString
    }, data), (key) => {
        switch (key) {
            case "log": return "info";
        }
        return key;
    });

    if (log.info) {
        try {
            log.info = checkFormat({
                hash: checkHash,
                nonce: checkBigNumber
            }, JSON.parse(<any>log.info));
        }
        catch (error) {
            log.info = {
                hash: null,
                nonce: null,
                message: <any>log.info
            }
        }
    }
    return log;
}


//////////////////////////////
// Event Serializeing

function getEventTag(eventName: EventType): string {
    if (typeof (eventName) === 'string') {
        if (hexDataLength(eventName) === 20) {
            return 'address:' + getAddress(eventName);
        }

        eventName = eventName.toLowerCase();

        if (hexDataLength(eventName) === 32) {
            return 'tx:' + eventName;
        }

        if (eventName.indexOf(':') === -1) {
            return eventName;
        }
    }

    throw new Error('invalid event - ' + eventName);
}

//////////////////////////////
// Helper Object

function getTime() {
    return (new Date()).getTime();
}

//////////////////////////////
// Provider Object


/**
 *  EventType
 *   - "block"
 *   - "pending"
 *   - "error"
 *   - address
 *   - filter
 *   - topics array
 *   - transaction hash
 */

type _Event = {
    listener: Listener;
    once: boolean;
    tag: string;
}

export class BaseProvider extends Provider {
    private _network: Network;

    private _events: Array<_Event>;

    // To help mitigate the eventually conssitent nature of the blockchain
    // we keep a mapping of events we emit. If we emit an event X, we expect
    // that a user should be able to query for that event in the callback,
    // if the node returns null, we stall the response until we get back a
    // meaningful value, since we may be hitting a re-org, or a node that
    // has not indexed the event yet.
    // Events:
    //   - t:{hash}    - Transaction hash
    //   - b:{hash}    - BlockHash
    //   - block       - The most recent emitted block
    protected _emitted: { [eventName: string]: number | 'pending' };

    private _pollingInterval: number;
    private _poller: any; // @TODO: what does TypeScript think setInterval returns?

    private _lastBlockNumber: number;

    // string => BigNumber
    private _balances: any;

    private _fastBlockNumber: number;
    private _fastBlockNumberPromise: Promise<number>;
    private _fastQueryDate: number;


    /**
     *  ready
     *
     *  A Promise<Network> that resolves only once the provider is ready.
     *
     *  Sub-classes that call the super with a network without a chainId
     *  MUST set this. Standard named networks have a known chainId.
     *
     */
    protected ready: Promise<Network>;

    constructor(network: Networkish | Promise<Network>) {
        super();
        errors.checkNew(this, Provider);

        if (network instanceof Promise) {
            defineReadOnly(this, 'ready', network.then((network) => {
                defineReadOnly(this, '_network', network);
                return network;
            }));

            // Squash any "unhandled promise" errors; the don't need to be handled
            this.ready.catch((error) => { });

        } else {
            let knownNetwork = getNetwork((network == null) ? 'homestead' : network);
            if (knownNetwork) {
                defineReadOnly(this, '_network', knownNetwork);
                defineReadOnly(this, 'ready', Promise.resolve(this._network));

            } else {
                errors.throwError('invalid network', errors.INVALID_ARGUMENT, { arg: 'network', value: network });
            }
        }

        this._lastBlockNumber = -2;

        // Balances being watched for changes
        this._balances = {};

        // Events being listened to
        this._events = [];

        this._pollingInterval = 4000;

        this._emitted = { block: -2 };

        this._fastQueryDate = 0;
    }

    getBlockNumber(): Promise<number> {
        return this.ready.then(() => {
            return this.perform('getBlockNumber', {}).then((result) => {
                let value = result ? parseInt(result) : 0;
                if (0 >= value) { throw new Error('invalid response - getBlockNumber'); }
                this._setFastBlockNumber(value);
                return value;
            });
        });
    }

    getTransactionRequest(route: string, transactionType: string, overrides?: any) {
        return getTransactionRequest(route, transactionType, overrides);
    }

    getTransactionFee(route: string, transactionType: string, overrides?: any): Promise<TransactionFee> {
        return this.ready.then(() => {
            let tx: TransactionRequest = (overrides && overrides.tx) ? overrides.tx : getTransactionRequest(route, transactionType, overrides);
            let transaction: Transaction = iterate(tx, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            transaction = sortObject(transaction);

            let params = {
                unsignedTransaction: base64Encode(toUtf8Bytes(JSON.stringify(transaction)))
            }
            return this.perform('getTransactionFee', params).then((fee) => {
                fee = checkTransactionFee(fee);
                return fee;
            });
        });
    }

    getTransactionFeeSetting(transactionType: string, overrides?: any): Promise<TransactionFeeSetting> {
        return this.ready.then(() => {
            let params = {
                path: "/custom/fee/get_msg_fee_setting/" + transactionType,
            }
            return this.perform('getTransactionFeeSetting', params);
        });
    }

    getStatus(): Promise<any> {
        return this.ready.then(() => {
            return this.perform('getStatus', {}).then((result) => {
                return checkStatus(result);
            });
        });
    }

    getTokenState(symbol: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenState> {
        return this.ready.then(() => {
            return resolveProperties({ symbol: symbol, blockTag: blockTag }).then(({ symbol, blockTag }) => {
                let params = {
                    symbol: symbol,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getTokenState', params).then((result) => {
                    let state: TokenState = result;
                    if (result) {
                        state = checkTokenState(result);
                    }
                    return state;
                });
            });
        });
    }

    getTokenList(blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenList> {
        return this.ready.then(() => {
            return resolveProperties({ blockTag: blockTag }).then(({ blockTag }) => {
                let params = {
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getTokenList', params).then((result) => {
                    if (result) {
                        result = camelize(checkFormat({
                            fungible: arrayOf(checkString),
                            nonfungible: arrayOf(checkString)
                        }, result));
                    }
                    return result;
                });
            });
        });
    }

    getTokenAccountState(symbol: string | Promise<string>, addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenAccountState> {
        return this.ready.then(() => {
            return resolveProperties({ symbol: symbol, addressOrName: addressOrName, blockTag: blockTag }).then(({ symbol, addressOrName, blockTag }) => {
                return this.resolveName(addressOrName).then((address) => {
                    let params = {
                        symbol: symbol,
                        address: address,
                        blockTag: checkBlockTag(blockTag)
                    };
                    return this.perform('getTokenAccountState', params).then((result) => {
                        if (result) {
                            result = checkTokenAccountState(result);
                        }
                        else {
                            result = {
                                owner: address,
                                frozen: false,
                                balance: bigNumberify(0)
                            }
                        }
                        return result;
                    });
                });
            });
        });
    }

    getTokenAccountBalance(symbol: string | Promise<string>, addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber> {
        return this.getTokenAccountState(symbol, addressOrName, blockTag).then((state) => {
            if (state && state.balance) {
                return state.balance;
            }
            return bigNumberify(0);
        });
    }

    getNFTokenState(symbol: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<NFTokenState> {
        return this.ready.then(() => {
            return resolveProperties({ symbol: symbol, blockTag: blockTag }).then(({ symbol, blockTag }) => {
                let params = {
                    symbol: symbol,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getNFTokenState', params).then((result) => {
                    let state: NFTokenState = result;

                    if (result) {
                        state = checkNonFungibleTokenState(result);
                    }
                    return state;
                });
            });
        });
    }

    getNFTokenItemState(symbol: string | Promise<string>, itemID: string, blockTag?: BlockTag | Promise<BlockTag>): Promise<NFTokenItemState> {
        return this.ready.then(() => {
            return resolveProperties({ symbol: symbol, itemID: itemID, blockTag: blockTag }).then(({ symbol, itemID, blockTag }) => {
                let params = {
                    symbol: symbol,
                    itemID: itemID,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getNFTokenItemState', params).then((result) => {
                    let state: NFTokenItemState = result;
                    if (result) {
                        state = checkNonFungibleTokenItemState(result);
                    }
                    return state;
                });
            });
        });
    }

    getAliasState(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AliasState> {
        return resolveProperties({ address, blockTag }).then(({ address, blockTag }) => {
            return this.ready.then(() => {
                let params = {
                    address,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getAliasState', params).then((result) => {
                    if (result) {
                        return checkAliasState(result);
                    }
                    return null;
                });
            });
        });
    }

    getAccountState(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AccountState> {
        return this.ready.then(() => {
            return resolveProperties({ addressOrName: addressOrName, blockTag: blockTag }).then(({ addressOrName, blockTag }) => {
                return this.resolveName(addressOrName).then((address) => {
                    let params = {
                        address: address,
                        blockTag: checkBlockTag(blockTag)
                    };
                    return this.perform('getAccountState', params).then((result) => {
                        if (result) {
                            result = camelize(checkFormat({
                                type: checkString,
                                value: checkAny
                            }, result));
                        }
                        return result;
                    });
                });
            });
        });
    }

    getAccountNumber(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber> {
        return this.ready.then(() => {
            return this.getAccountState(addressOrName, blockTag).then((result) => {
                if (result && result.value && result.value.accountNumber) {
                    return bigNumberify(result.value.accountNumber);
                }
                return bigNumberify(0);
            });
        });
    }

    getBalance(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber> {
        return this.ready.then(() => {
            return this.getAccountState(addressOrName, blockTag).then((result) => {
                if (result && result.value && result.value.coins) {
                    let coins = result.value.coins;
                    if (0 < coins.length) {
                        if (coins[0].amount) {
                            return bigNumberify(coins[0].amount);
                        }
                    }
                }
                return bigNumberify(0);
            });
        });
    }

    getTransactionCount(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber> {
        return this.ready.then(() => {
            return this.getAccountState(addressOrName, blockTag).then((result) => {
                if (result && result.value && result.value.sequence) {
                    return bigNumberify(result.value.sequence);
                }
                return bigNumberify(0);
            });
        });
    }

    sendTransaction(signedTransaction: string | Promise<string>, overrides?: any): Promise<TransactionResponse> {
        return this.ready.then(() => {
            return resolveProperties({ signedTransaction: signedTransaction }).then(({ signedTransaction }) => {
                let params = { signedTransaction };
                let async = overrides && overrides.async ? true : false;
                return this.perform(async ? 'sendTransactionAsync' : 'sendTransaction', params).then((result) => {
                    return this._wrapTransaction(parseTransaction(signedTransaction), result.hash, result.blockNumber);
                }, function (error) {
                    error.transaction = parseTransaction(signedTransaction);
                    if (error.response && error.response.hash) {
                        (<any>error).transactionHash = error.response.hash;
                    }
                    throw error;
                });
            });
        });
    }

    // This should be called by any subclass wrapping a TransactionResponse
    _wrapTransaction(tx: Transaction, hash?: string, blockNumber?: number): TransactionResponse {
        // Check the hash we expect is the same as the hash the server reported
        if (hash != null) {
            if (hexDataLength(hash) !== 32) {
                errors.throwError('invalid response - sendTransaction', errors.INVALID_ARGUMENT, { expectedHash: tx.hash, returnedHash: hash });
            }

            // TODO Currently we are not able to calculate the transaction hash that based on amino format
            // RISK: There is a risk to lost a sent transaction when the transaction response is not available, but the network has captured and processed it.
            tx.hash = hash.toLowerCase();

            hash = hash.toLowerCase();
            if (tx.hash !== hash) {
                errors.throwError('Transaction hash mismatch from Provider.sendTransaction.', errors.UNKNOWN_ERROR, { expectedHash: tx.hash, returnedHash: hash });
            }
        }

        let result: TransactionResponse = <TransactionResponse>tx;

        if (!result.blockNumber && blockNumber) {
            result.blockNumber = blockNumber;
        }

        // @TODO: (confirmations? number, timeout? number)
        result.wait = (confirmations?: number) => {

            // We know this transaction *must* exist (whether it gets mined is
            // another story), so setting an emitted value forces us to
            // wait even if the node returns null for the receipt
            if (confirmations !== 0) {
                this._emitted['t:' + tx.hash] = 'pending';
            }

            return this.waitForTransaction(tx.hash, confirmations).then((receipt) => {
                if (receipt == null && confirmations === 0) { return null; }

                // No longer pending, allow the polling loop to garbage collect this
                this._emitted['t:' + tx.hash] = receipt.blockNumber;

                if (receipt.status === 0) {
                    errors.throwError('transaction failed', errors.CALL_EXCEPTION, {
                        transactionHash: tx.hash,
                        transaction: tx
                    });
                }
                return receipt;
            });
        };

        return result;
    }

    getBlock(blockTag: BlockTag | Promise<BlockTag>): Promise<Block> {
        return this.ready.then(() => {
            return resolveProperties({ blockTag }).then(({ blockTag }) => {
                try {
                    let blockNumber;

                    blockTag = checkBlockTag(blockTag);
                    if (isHexString(blockTag)) {
                        blockNumber = parseInt(blockTag.substring(2), 16);
                    }
                    else {
                        blockNumber = parseInt(blockTag);
                    }

                    if (0 == blockNumber) {
                        return this.getBlockNumber().then((blockNumber) => {
                            return this.getBlock(blockNumber);
                        });
                    }

                    return poll(() => {
                        let promises = [
                            // Query block result
                            this.perform('getBlock', { blockTag: blockNumber.toString() }),
                            // Query block details (except timestamp)
                            this.perform('getBlockInfo', { blockTag: blockNumber.toString() }),
                            // Query block timestamp (only available in new block, this block might not be available at that point)
                            this.perform('getBlockInfo', { blockTag: (blockNumber + 1).toString() })
                        ];
                        return Promise.all(promises).then((results) => {
                            if (isUndefinedOrNullOrEmpty(results) ||
                                isUndefinedOrNullOrEmpty(results[0]) || isUndefinedOrNullOrEmpty(results[1])) {
                                if (blockNumber <= this._emitted.block) {
                                    return undefined;
                                }
                                return null;
                            }
                            let block = checkBlock(results[0]);
                            let blockInfo = checkBlockInfo(results[1]);

                            blockInfo.blockTime = null;

                            if (!isUndefinedOrNullOrEmpty(results[2])) {
                                let newBlockInfo = checkBlockInfo(results[2]);
                                blockInfo.blockTime = newBlockInfo.blockTime;
                            }
                            return {
                                ...block,
                                ...blockInfo
                            }
                        });
                    }, { onceBlock: this });
                } catch (error) { }

                throw new Error('invalid block tag');
            });
        });
    }

    getTransaction(transactionHash: string): Promise<TransactionResponse> {
        return <Promise<TransactionResponse>>this.getTransactionReceipt(transactionHash);
    }

    checkTransactionReceipt(receipt: TransactionReceipt, code?: string, message?: string, params?: any) {
        return this.checkResponseLog("", receipt, code, message, params);
    }

    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
        return this.ready.then(() => {
            return resolveProperties({ transactionHash: transactionHash }).then(({ transactionHash }) => {
                let params = { transactionHash: checkHash(transactionHash, true) };
                return poll(() => {
                    return this.perform('getTransactionReceipt', params).then((result) => {
                        if (result == null) {
                            if (this._emitted['t:' + transactionHash] == null) {
                                return null;
                            }
                            return undefined;
                        }

                        let tx = checkTransactionReceipt(result);

                        if (tx) {
                            if (tx.blockNumber == null) {
                                tx.confirmations = 0;

                            } else if (tx.confirmations == null) {
                                return this._getFastBlockNumber().then((blockNumber) => {

                                    // Add the confirmations using the fast block number (pessimistic)
                                    let confirmations = (blockNumber - tx.blockNumber) + 1;
                                    if (confirmations <= 0) { confirmations = 1; }
                                    tx.confirmations = confirmations;

                                    return tx;
                                });
                            }
                        }

                        return tx;
                    });
                }, { onceBlock: this });
            });
        });
    }

    getPrice(): Promise<number> {
        return this.ready.then(() => {
            return this.perform('getPrice', {}).then((result) => {
                // @TODO: Check valid float
                return result;
            });
        });
    }

    isWhitelisted(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<boolean> {
        return resolveProperties({ addressOrName: addressOrName, blockTag: blockTag }).then(({ addressOrName, blockTag }) => {
            // If it is a promise, resolve it then recurse
            if (addressOrName instanceof Promise) {
                return addressOrName.then((address) => {
                    return this.isWhitelisted(address, blockTag);
                });
            }

            return this.ready.then(() => {
                let params = {
                    address: addressOrName,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('isWhitelisted', params).then((result) => {
                    return result;
                });
            });
        });
    }

    getKycAddress(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string> {
        return resolveProperties({ addressOrName: addressOrName, blockTag: blockTag }).then(({ addressOrName, blockTag }) => {
            // If it is a promise, resolve it then recurse
            if (addressOrName instanceof Promise) {
                return addressOrName.then((address) => {
                    return this.getKycAddress(address, blockTag);
                });
            }

            return this.ready.then(() => {
                let params = {
                    address: addressOrName,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getKycAddress', params).then((result) => {
                    return result;
                });
            });
        });
    }

    resolveName(name: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string> {
        return resolveProperties({ name: name, blockTag: blockTag }).then(({ name, blockTag }) => {
            // If it is already an address, nothing to resolve
            try {
                return getAddress(name);
            } catch (error) { }

            return this.ready.then(() => {
                let params = {
                    name: name,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('resolveName', params).then((address) => {
                    if (!address) {
                        errors.throwError('invalid address', errors.INVALID_ADDRESS, { value: name });
                    }
                    return address;
                });
            });
        });
    }

    lookupAddress(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string> {
        return resolveProperties({ address: address, blockTag: blockTag }).then(({ address, blockTag }) => {
            if (address instanceof Promise) {
                return address.then((address) => {
                    return this.lookupAddress(address);
                });
            }

            address = getAddress(address);

            return this.ready.then(() => {
                let params = {
                    address: address,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('lookupAddress', params).then((name) => {
                    return name;
                });
            });
        });
    }

    static checkTransactionReceipt(transaction: any): TransactionReceipt {
        return checkTransactionReceipt(transaction);
    }

    doPoll(): void {
    }

    perform(method: string, params: any): Promise<any> {
        errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
        return null;
    }

    checkResponseLog(method: string, result: any, code?: string, message?: string, params?: any) {
        errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
        return null;
    }

    protected _startPending(): void {
        errors.warn('WARNING: this provider does not support pending events');
    }

    protected _stopPending(): void {
    }

    private _addEventListener(eventName: EventType, listener: Listener, once: boolean): void {
        this._events.push({
            tag: getEventTag(eventName),
            listener: listener,
            once: once,
        });
        if (eventName === 'pending') { this._startPending(); }
        this.polling = true;
    }

    on(eventName: EventType, listener: Listener): Provider {
        this._addEventListener(eventName, listener, false);
        return this;
    }

    once(eventName: EventType, listener: Listener): Provider {
        this._addEventListener(eventName, listener, true);
        return this;
    }

    addEventListener(eventName: EventType, listener: Listener): Provider {
        return this.on(eventName, listener);
    }

    emit(eventName: EventType, ...args: Array<any>): boolean {
        let result = false;

        let eventTag = getEventTag(eventName);
        this._events = this._events.filter((event) => {
            if (event.tag !== eventTag) { return true; }
            setTimeout(() => {
                event.listener.apply(this, args);
            }, 0);
            result = true;
            return !(event.once);
        });

        if (this.listenerCount() === 0) { this.polling = false; }

        return result;
    }

    listenerCount(eventName?: EventType): number {
        if (!eventName) { return this._events.length; }

        let eventTag = getEventTag(eventName);
        return this._events.filter((event) => {
            return (event.tag === eventTag);
        }).length;
    }

    listeners(eventName: EventType): Array<Listener> {
        let eventTag = getEventTag(eventName);
        return this._events.filter((event) => {
            return (event.tag === eventTag);
        }).map((event) => {
            return event.listener;
        });
    }

    removeAllListeners(eventName?: EventType): Provider {
        if (eventName == null) {
            this._events = [];
            this._stopPending();
        } else {
            let eventTag = getEventTag(eventName);
            this._events = this._events.filter((event) => {
                return (event.tag !== eventTag);
            });
            if (eventName === 'pending') { this._stopPending(); }
        }

        if (this._events.length === 0) { this.polling = false; }

        return this;
    }

    removeListener(eventName: EventType, listener: Listener): Provider {
        let found = false;

        let eventTag = getEventTag(eventName);
        this._events = this._events.filter((event) => {
            if (event.tag !== eventTag || event.listener != listener) { return true; }
            if (found) { return true; }
            found = true;
            return false;
        });

        if (eventName === 'pending' && this.listenerCount('pending') === 0) { this._stopPending(); }
        if (this.listenerCount() === 0) { this.polling = false; }

        return this;
    }

    private _doPoll(): void {
        this.getBlockNumber().then((blockNumber) => {
            this._setFastBlockNumber(blockNumber);

            // If the block hasn't changed, meh.
            if (blockNumber === this._lastBlockNumber) { return; }

            // First polling cycle, trigger a "block" events
            if (this._emitted.block === -2) {
                this._emitted.block = blockNumber - 1;
            }

            // Notify all listener for each block that has passed
            for (let i = (<number>this._emitted.block) + 1; i <= blockNumber; i++) {
                this.emit('block', i);
            }

            // The emitted block was updated, check for obsolete events
            if ((<number>this._emitted.block) !== blockNumber) {
                this._emitted.block = blockNumber;

                Object.keys(this._emitted).forEach((key) => {
                    // The block event does not expire
                    if (key === 'block') { return; }

                    // The block we were at when we emitted this event
                    let eventBlockNumber = this._emitted[key];

                    // We cannot garbage collect pending transactions or blocks here
                    // They should be garbage collected by the Provider when setting
                    // "pending" events
                    if (eventBlockNumber === 'pending') { return; }

                    // Evict any transaction hashes or block hashes over 12 blocks
                    // old, since they should not return null anyways
                    if (blockNumber - eventBlockNumber > 12) {
                        delete this._emitted[key];
                    }
                });
            }

            // First polling cycle
            if (this._lastBlockNumber === -2) {
                this._lastBlockNumber = blockNumber - 1;
            }

            // Sweep balances and remove addresses we no longer have events for
            let newBalances: any = {};

            // Find all transaction hashes we are waiting on
            let uniqueEventTags: { [tag: string]: boolean } = {};
            this._events.forEach((event) => {
                uniqueEventTags[event.tag] = true;
            });

            Object.keys(uniqueEventTags).forEach((tag) => {
                let comps = tag.split(':');
                switch (comps[0]) {
                    case 'tx': {
                        let hash = comps[1];
                        this.getTransactionReceipt(hash).then((receipt) => {
                            if (!receipt || receipt.blockNumber == null) { return null; }
                            receipt.hash = receipt.hash.toLowerCase();
                            this._emitted['t:' + hash] = receipt.blockNumber;
                            this.emit(hash, receipt);
                            return null;
                        }).catch((error: Error) => {
                            this.emit('error', error);
                        });

                        break;
                    }

                    case 'address': {
                        let address = comps[1];
                        if (this._balances[address]) {
                            newBalances[address] = this._balances[address];
                        }

                        this.getBalance(address, 'latest').then((balance) => {
                            let lastBalance = this._balances[address];
                            if (lastBalance && balance.eq(lastBalance)) { return; }
                            this._balances[address] = balance;
                            this.emit(address, balance);
                            return null;
                        }).catch((error: Error) => { this.emit('error', error); });

                        break;
                    }
                }
            });

            this._lastBlockNumber = blockNumber;

            this._balances = newBalances;

            return null;
        }).catch((error: Error) => { });

        this.doPoll();
    }

    resetEventsBlock(blockNumber: number): void {
        this._lastBlockNumber = blockNumber - 1;
        if (this.polling) { this._doPoll(); }
    }

    get network(): Network {
        return this._network;
    }

    getNetwork(): Promise<Network> {
        return this.ready;
    }

    get blockNumber(): number {
        return this._fastBlockNumber;
    }

    get polling(): boolean {
        return (this._poller != null);
    }

    set polling(value: boolean) {
        setTimeout(() => {
            if (value && !this._poller) {
                this._poller = setInterval(this._doPoll.bind(this), this.pollingInterval);
                this._doPoll();

            } else if (!value && this._poller) {
                clearInterval(this._poller);
                this._poller = null;
            }
        }, 0);
    }

    get pollingInterval(): number {
        return this._pollingInterval;
    }

    set pollingInterval(value: number) {
        if (typeof (value) !== 'number' || value <= 0 || parseInt(String(value)) != value) {
            throw new Error('invalid polling interval');
        }

        this._pollingInterval = value;

        if (this._poller) {
            clearInterval(this._poller);
            this._poller = setInterval(() => { this._doPoll() }, this._pollingInterval);
        }
    }

    _getFastBlockNumber(): Promise<number> {
        let now = getTime();

        // Stale block number, request a newer value
        if ((now - this._fastQueryDate) > 2 * this._pollingInterval) {
            this._fastQueryDate = now;
            this._fastBlockNumberPromise = this.getBlockNumber().then((blockNumber) => {
                if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
                    this._fastBlockNumber = blockNumber;
                }
                return this._fastBlockNumber;
            });
        }

        return this._fastBlockNumberPromise;
    }

    _setFastBlockNumber(blockNumber: number): void {
        // Older block, maybe a stale request
        if (this._fastBlockNumber != null && blockNumber < this._fastBlockNumber) { return; }

        // Update the time we updated the blocknumber
        this._fastQueryDate = getTime();

        // Newer block number, use  it
        if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
            this._fastBlockNumber = blockNumber;
            this._fastBlockNumberPromise = Promise.resolve(blockNumber);
        }
    }

    // @TODO: Add .poller which must be an event emitter with a 'start', 'stop' and 'block' event;
    //        this will be used once we move to the WebSocket or other alternatives to polling

    waitForTransaction(transactionHash: string, confirmations?: number): Promise<TransactionReceipt> {
        if (confirmations == null) { confirmations = 1; }

        return this.getTransactionReceipt(transactionHash).then((receipt) => {
            if (confirmations === 0 || (receipt && receipt.confirmations >= confirmations)) {
                return receipt;
            }

            return <Promise<TransactionReceipt>>(new Promise((resolve) => {
                let handler = (receipt: TransactionReceipt) => {
                    if (receipt.confirmations < confirmations) { return; }
                    this.removeListener(transactionHash, handler);
                    resolve(receipt);
                }
                this.on(transactionHash, handler);
            }));
        });
    }

}

function checkBlockTag(blockTag: BlockTag): string {
    if (blockTag == null) { return '0'; }

    if (blockTag === 'earliest') { return '0'; }

    if (blockTag === 'latest' || blockTag === 'pending') {
        return "0";
    }

    if (isHexString(blockTag)) { return bigNumberify(blockTag).toString(); }

    try {
        if ('string' === typeof blockTag)
            return parseInt(blockTag).toString();

        return blockTag.toString();
    }
    catch (error) {
    }

    throw new Error('invalid blockTag');
}

defineReadOnly(Provider, 'inherits', inheritable(Provider));
