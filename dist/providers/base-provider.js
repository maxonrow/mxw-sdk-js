'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../utils/address");
const bignumber_1 = require("../utils/bignumber");
const bytes_1 = require("../utils/bytes");
const networks_1 = require("../utils/networks");
const properties_1 = require("../utils/properties");
const transaction_1 = require("../utils/transaction");
const web_1 = require("../utils/web");
const base64_1 = require("../utils/base64");
const misc_1 = require("../utils/misc");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const errors = __importStar(require("../errors"));
///////////////////////////////
// Imported Abstracts
const abstract_provider_1 = require("./abstract-provider");
//////////////////////////////
// Request and Response Checking
function checkKeyValue(data) {
    return misc_1.checkFormat({
        key: misc_1.checkString,
        value: misc_1.checkString
    }, data);
}
function checkTypeAttribute(data) {
    return misc_1.checkFormat({
        type: misc_1.checkString,
        attributes: misc_1.allowNullOrEmpty(misc_1.arrayOf(checkKeyValue))
    }, data);
}
function checkAliasState(data) {
    return properties_1.camelize(misc_1.checkFormat({
        Name: misc_1.checkString,
        Approved: misc_1.checkBoolean,
        Owner: misc_1.checkString,
        Metadata: misc_1.checkString,
        Fee: misc_1.checkBigNumber
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
function checkTokenState(data) {
    return properties_1.camelize(misc_1.checkFormat({
        Flags: misc_1.checkNumber,
        Name: misc_1.checkString,
        Symbol: misc_1.checkString,
        Decimals: misc_1.checkNumber,
        TotalSupply: misc_1.checkBigNumber,
        MaxSupply: misc_1.checkBigNumber,
        Owner: misc_1.checkString,
        NewOwner: misc_1.checkString,
        Metadata: misc_1.checkString
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
function checkNonFungibleTokenState(data) {
    return properties_1.camelize(misc_1.checkFormat({
        Flags: misc_1.checkNumber,
        Name: misc_1.checkString,
        Symbol: misc_1.checkString,
        Owner: misc_1.checkAddress,
        NewOwner: misc_1.checkAddress,
        Metadata: misc_1.allowNullOrEmpty(misc_1.arrayOf(misc_1.checkString)),
        Properties: misc_1.allowNullOrEmpty(misc_1.arrayOf(misc_1.checkString)),
        TransferLimit: misc_1.checkBigNumber,
        MintLimit: misc_1.checkBigNumber,
        TotalSupply: misc_1.checkString
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
        }
        return key;
    });
}
function checkNonFungibleTokenItemState(data) {
    return properties_1.camelize(misc_1.checkFormat({
        ID: misc_1.checkString,
        Metadata: misc_1.arrayOf(misc_1.checkString),
        Properties: misc_1.arrayOf(misc_1.checkString),
        Frozen: misc_1.checkBoolean,
        TransferLimit: misc_1.checkBigNumber
    }, data), (key) => {
        switch (key) {
            case "ID": return "id";
            case "Metadata": return "metadata";
            case "Properties": return "properties";
            case "Frozen": return "frozen";
            case "TransferLimit": return "transferLimit";
        }
        return key;
    });
}
function checkTokenAccountState(data) {
    return properties_1.camelize(misc_1.checkFormat({
        Owner: misc_1.checkString,
        Frozen: misc_1.checkBoolean,
        Balance: misc_1.checkBigNumber
    }, data), (key) => {
        switch (key) {
            case "Owner": return "owner";
            case "Frozen": return "frozen";
            case "Balance": return "balance";
        }
        return key;
    });
}
function checkStatus(data) {
    return properties_1.camelize(misc_1.checkFormat({
        node_info: {
            protocol_version: {
                p2p: misc_1.checkNumber,
                block: misc_1.checkNumber,
                app: misc_1.checkNumber
            },
            id: misc_1.checkHex,
            listen_addr: misc_1.checkString,
            network: misc_1.checkString,
            version: misc_1.checkString,
            channels: misc_1.checkNumber,
            moniker: misc_1.checkString,
            other: {
                tx_index: misc_1.checkString,
                rpc_address: misc_1.checkString
            }
        },
        sync_info: {
            latest_block_hash: misc_1.checkHash,
            latest_app_hash: misc_1.checkHash,
            latest_block_height: misc_1.checkNumber,
            latest_block_time: misc_1.checkTimestamp,
            catching_up: misc_1.checkBoolean
        },
        validator_info: {
            address: misc_1.checkHexAddress,
            pub_key: {
                type: misc_1.checkString,
                value: misc_1.checkString
            },
            voting_power: misc_1.checkNumber
        }
    }, data), (key) => {
        switch (key) {
            case "listenAddr": return "listenAddress";
            case "latestBlockHeight": return "latestBlockNumber";
        }
        return key;
    });
}
function checkTransactionFee(fee) {
    return properties_1.camelize(misc_1.checkFormat({
        amount: misc_1.arrayOf(checkTransactionFeeAmount),
        gas: misc_1.checkBigNumber
    }, fee));
}
function checkTransactionFeeAmount(amount) {
    return properties_1.camelize(misc_1.checkFormat({
        amount: misc_1.checkBigNumber,
        denom: misc_1.checkString
    }, amount));
}
function checkBlock(data) {
    let block = properties_1.camelize(misc_1.checkFormat({
        height: misc_1.checkNumber,
        results: {
            deliver_tx: misc_1.allowNullOrEmpty(misc_1.arrayOf(checkDeliverTransaction))
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
            let events = [];
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
    return properties_1.camelize(block);
}
function checkBlockInfo(data) {
    data = properties_1.camelize(misc_1.checkFormat({
        block: {
            header: {
                height: misc_1.checkNumber,
                time: misc_1.checkTimestamp,
                total_txs: misc_1.checkNumber,
                proposer_address: misc_1.checkString
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
        data.block.header.proposerAddress = utils_1.computeAddress(data.block.header.proposerAddress, constants_1.ValOperatorAddressPrefix);
        return Object.assign({}, data.block.header);
    }
    return undefined;
}
function checkDeliverTransaction(value) {
    let transaction = properties_1.camelize(misc_1.checkFormat({
        log: misc_1.allowNullOrEmpty(misc_1.checkString),
        events: checkTransactionEvents
    }, value), (key) => {
        switch (key) {
            case "log": return "logs";
        }
        return key;
    });
    try {
        let logs = JSON.parse(transaction.logs);
        transaction.logs = [];
        if (Array.isArray(logs)) {
            for (let log of logs) {
                transaction.logs.push(checkTransactionLog(log));
            }
            if (0 < transaction.logs.length) {
                let log = transaction.logs[0];
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
function checkTransactionEvent(data) {
    let kv = checkKeyValue(data);
    if ("string" === typeof kv.value) {
        kv.value = JSON.parse(utils_1.toUtf8String(base64_1.decode(kv.value)));
    }
    let event = properties_1.camelize(misc_1.checkFormat({
        hash: misc_1.checkString,
        params: misc_1.allowNullOrEmpty(misc_1.arrayOf(misc_1.checkString))
    }, kv.value));
    event.address = misc_1.checkAddress(utils_1.toUtf8String(base64_1.decode(kv.key)));
    event.hash = "0x" + event.hash;
    return event;
}
function checkTransactionEvents(data) {
    let groups = misc_1.allowNullOrEmpty(misc_1.arrayOf(checkTypeAttribute))(data);
    let events = [];
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
function checkTransactionReceipt(transaction) {
    let receipt = properties_1.camelize(misc_1.checkFormat({
        hash: misc_1.checkHash,
        height: misc_1.checkNumber,
        status: misc_1.checkNumber,
        index: misc_1.checkNumber,
        tx_result: {
            log: misc_1.checkString,
            events: checkTransactionEvents
        },
        tx: misc_1.checkString
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
        let events = [];
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
                let logs = JSON.parse(receipt.result.logs);
                receipt.result.logs = [];
                if (Array.isArray(logs)) {
                    for (let log of logs) {
                        receipt.result.logs.push(checkTransactionLog(log));
                    }
                    if (0 < receipt.result.logs.length) {
                        let log = receipt.result.logs[0];
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
            catch (error) {
                receipt.result.logs = undefined;
            }
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
    return properties_1.camelize(receipt);
}
function checkTransactionLog(data) {
    if ("string" === typeof data) {
        data = JSON.parse(data);
    }
    let log = properties_1.camelize(misc_1.checkFormat({
        success: misc_1.checkBoolean,
        log: misc_1.checkString
    }, data), (key) => {
        switch (key) {
            case "log": return "info";
        }
        return key;
    });
    if (log.info) {
        try {
            log.info = misc_1.checkFormat({
                hash: misc_1.checkHash,
                nonce: misc_1.checkBigNumber
            }, JSON.parse(log.info));
        }
        catch (error) {
            log.info = {
                hash: null,
                nonce: null,
                message: log.info
            };
        }
    }
    return log;
}
//////////////////////////////
// Event Serializeing
function getEventTag(eventName) {
    if (typeof (eventName) === 'string') {
        if (bytes_1.hexDataLength(eventName) === 20) {
            return 'address:' + address_1.getAddress(eventName);
        }
        eventName = eventName.toLowerCase();
        if (bytes_1.hexDataLength(eventName) === 32) {
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
class BaseProvider extends abstract_provider_1.Provider {
    constructor(network) {
        super();
        errors.checkNew(this, abstract_provider_1.Provider);
        if (network instanceof Promise) {
            properties_1.defineReadOnly(this, 'ready', network.then((network) => {
                properties_1.defineReadOnly(this, '_network', network);
                return network;
            }));
            // Squash any "unhandled promise" errors; the don't need to be handled
            this.ready.catch((error) => { });
        }
        else {
            let knownNetwork = networks_1.getNetwork((network == null) ? 'homestead' : network);
            if (knownNetwork) {
                properties_1.defineReadOnly(this, '_network', knownNetwork);
                properties_1.defineReadOnly(this, 'ready', Promise.resolve(this._network));
            }
            else {
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
    getBlockNumber() {
        return this.ready.then(() => {
            return this.perform('getBlockNumber', {}).then((result) => {
                let value = result ? parseInt(result) : 0;
                if (0 >= value) {
                    throw new Error('invalid response - getBlockNumber');
                }
                this._setFastBlockNumber(value);
                return value;
            });
        });
    }
    getTransactionRequest(route, transactionType, overrides) {
        return transaction_1.getTransactionRequest(route, transactionType, overrides);
    }
    getTransactionFee(route, transactionType, overrides) {
        return this.ready.then(() => {
            let tx = (overrides && overrides.tx) ? overrides.tx : transaction_1.getTransactionRequest(route, transactionType, overrides);
            let transaction = misc_1.iterate(tx, function (key, value, type) {
                switch (type) {
                    case "Number":
                    case "BigNumber":
                        return value.toString();
                }
                return value;
            });
            transaction = misc_1.sortObject(transaction);
            let params = {
                unsignedTransaction: base64_1.encode(utils_1.toUtf8Bytes(JSON.stringify(transaction)))
            };
            return this.perform('getTransactionFee', params).then((fee) => {
                fee = checkTransactionFee(fee);
                return fee;
            });
        });
    }
    getTransactionFeeSetting(transactionType, overrides) {
        return this.ready.then(() => {
            let params = {
                path: "/custom/fee/get_msg_fee_setting/" + transactionType,
            };
            return this.perform('getTransactionFeeSetting', params);
        });
    }
    getStatus() {
        return this.ready.then(() => {
            return this.perform('getStatus', {}).then((result) => {
                return checkStatus(result);
            });
        });
    }
    getTokenState(symbol, blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ symbol: symbol, blockTag: blockTag }).then(({ symbol, blockTag }) => {
                let params = {
                    symbol: symbol,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getTokenState', params).then((result) => {
                    let state = result;
                    if (result) {
                        state = checkTokenState(result);
                    }
                    return state;
                });
            });
        });
    }
    getTokenList(blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ blockTag: blockTag }).then(({ blockTag }) => {
                let params = {
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getTokenList', params).then((result) => {
                    if (result) {
                        result = properties_1.camelize(misc_1.checkFormat({
                            fungible: misc_1.arrayOf(misc_1.checkString),
                            nonfungible: misc_1.arrayOf(misc_1.checkString)
                        }, result));
                    }
                    return result;
                });
            });
        });
    }
    getTokenAccountState(symbol, addressOrName, blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ symbol: symbol, addressOrName: addressOrName, blockTag: blockTag }).then(({ symbol, addressOrName, blockTag }) => {
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
                        return result;
                    });
                });
            });
        });
    }
    getNFTokenState(symbol, blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ symbol: symbol, blockTag: blockTag }).then(({ symbol, blockTag }) => {
                let params = {
                    symbol: symbol,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getNFTokenState', params).then((result) => {
                    let state = result;
                    if (result) {
                        state = checkNonFungibleTokenState(result);
                    }
                    return state;
                });
            });
        });
    }
    getNFTokenItemState(symbol, itemID, blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ symbol: symbol, itemID: itemID, blockTag: blockTag }).then(({ symbol, itemID, blockTag }) => {
                let params = {
                    symbol: symbol,
                    itemID: itemID,
                    blockTag: checkBlockTag(blockTag)
                };
                return this.perform('getNFTokenItemState', params).then((result) => {
                    let state = result;
                    if (result) {
                        state = checkNonFungibleTokenItemState(result);
                    }
                    return state;
                });
            });
        });
    }
    getAliasState(address, blockTag) {
        return properties_1.resolveProperties({ address, blockTag }).then(({ address, blockTag }) => {
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
    getAccountState(addressOrName, blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ addressOrName: addressOrName, blockTag: blockTag }).then(({ addressOrName, blockTag }) => {
                return this.resolveName(addressOrName).then((address) => {
                    let params = {
                        address: address,
                        blockTag: checkBlockTag(blockTag)
                    };
                    return this.perform('getAccountState', params).then((result) => {
                        if (result) {
                            result = properties_1.camelize(misc_1.checkFormat({
                                type: misc_1.checkString,
                                value: misc_1.checkAny
                            }, result));
                        }
                        return result;
                    });
                });
            });
        });
    }
    getAccountNumber(addressOrName, blockTag) {
        return this.ready.then(() => {
            return this.getAccountState(addressOrName, blockTag).then((result) => {
                if (result && result.value && result.value.accountNumber) {
                    return bignumber_1.bigNumberify(result.value.accountNumber);
                }
                return bignumber_1.bigNumberify(0);
            });
        });
    }
    getBalance(addressOrName, blockTag) {
        return this.ready.then(() => {
            return this.getAccountState(addressOrName, blockTag).then((result) => {
                if (result && result.value && result.value.coins) {
                    let coins = result.value.coins;
                    if (0 < coins.length) {
                        if (coins[0].amount) {
                            return bignumber_1.bigNumberify(coins[0].amount);
                        }
                    }
                }
                return bignumber_1.bigNumberify(0);
            });
        });
    }
    getTransactionCount(addressOrName, blockTag) {
        return this.ready.then(() => {
            return this.getAccountState(addressOrName, blockTag).then((result) => {
                if (result && result.value && result.value.sequence) {
                    return bignumber_1.bigNumberify(result.value.sequence);
                }
                return bignumber_1.bigNumberify(0);
            });
        });
    }
    sendTransaction(signedTransaction, overrides) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ signedTransaction: signedTransaction }).then(({ signedTransaction }) => {
                let params = { signedTransaction };
                let async = overrides && overrides.async ? true : false;
                return this.perform(async ? 'sendTransactionAsync' : 'sendTransaction', params).then((result) => {
                    return this._wrapTransaction(transaction_1.parse(signedTransaction), result.hash, result.blockNumber);
                }, function (error) {
                    error.transaction = transaction_1.parse(signedTransaction);
                    if (error.response && error.response.hash) {
                        error.transactionHash = error.response.hash;
                    }
                    throw error;
                });
            });
        });
    }
    // This should be called by any subclass wrapping a TransactionResponse
    _wrapTransaction(tx, hash, blockNumber) {
        // Check the hash we expect is the same as the hash the server reported
        if (hash != null) {
            if (bytes_1.hexDataLength(hash) !== 32) {
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
        let result = tx;
        if (!result.blockNumber && blockNumber) {
            result.blockNumber = blockNumber;
        }
        // @TODO: (confirmations? number, timeout? number)
        result.wait = (confirmations) => {
            // We know this transaction *must* exist (whether it gets mined is
            // another story), so setting an emitted value forces us to
            // wait even if the node returns null for the receipt
            if (confirmations !== 0) {
                this._emitted['t:' + tx.hash] = 'pending';
            }
            return this.waitForTransaction(tx.hash, confirmations).then((receipt) => {
                if (receipt == null && confirmations === 0) {
                    return null;
                }
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
    getBlock(blockTag) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ blockTag }).then(({ blockTag }) => {
                try {
                    let blockNumber;
                    blockTag = checkBlockTag(blockTag);
                    if (bytes_1.isHexString(blockTag)) {
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
                    return web_1.poll(() => {
                        let promises = [
                            // Query block result
                            this.perform('getBlock', { blockTag: blockNumber.toString() }),
                            // Query block details (except timestamp)
                            this.perform('getBlockInfo', { blockTag: blockNumber.toString() }),
                            // Query block timestamp (only available in new block, this block might not be available at that point)
                            this.perform('getBlockInfo', { blockTag: (blockNumber + 1).toString() })
                        ];
                        return Promise.all(promises).then((results) => {
                            if (misc_1.isUndefinedOrNullOrEmpty(results) ||
                                misc_1.isUndefinedOrNullOrEmpty(results[0]) || misc_1.isUndefinedOrNullOrEmpty(results[1])) {
                                if (blockNumber <= this._emitted.block) {
                                    return undefined;
                                }
                                return null;
                            }
                            let block = checkBlock(results[0]);
                            let blockInfo = checkBlockInfo(results[1]);
                            blockInfo.blockTime = null;
                            if (!misc_1.isUndefinedOrNullOrEmpty(results[2])) {
                                let newBlockInfo = checkBlockInfo(results[2]);
                                blockInfo.blockTime = newBlockInfo.blockTime;
                            }
                            return Object.assign(Object.assign({}, block), blockInfo);
                        });
                    }, { onceBlock: this });
                }
                catch (error) { }
                throw new Error('invalid block tag');
            });
        });
    }
    getTransaction(transactionHash) {
        return this.getTransactionReceipt(transactionHash);
    }
    checkTransactionReceipt(receipt, code, message, params) {
        return this.checkResponseLog("", receipt, code, message, params);
    }
    getTransactionReceipt(transactionHash) {
        return this.ready.then(() => {
            return properties_1.resolveProperties({ transactionHash: transactionHash }).then(({ transactionHash }) => {
                let params = { transactionHash: misc_1.checkHash(transactionHash, true) };
                return web_1.poll(() => {
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
                            }
                            else if (tx.confirmations == null) {
                                return this._getFastBlockNumber().then((blockNumber) => {
                                    // Add the confirmations using the fast block number (pessimistic)
                                    let confirmations = (blockNumber - tx.blockNumber) + 1;
                                    if (confirmations <= 0) {
                                        confirmations = 1;
                                    }
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
    getPrice() {
        return this.ready.then(() => {
            return this.perform('getPrice', {}).then((result) => {
                // @TODO: Check valid float
                return result;
            });
        });
    }
    isWhitelisted(addressOrName, blockTag) {
        return properties_1.resolveProperties({ addressOrName: addressOrName, blockTag: blockTag }).then(({ addressOrName, blockTag }) => {
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
    getKycAddress(addressOrName, blockTag) {
        return properties_1.resolveProperties({ addressOrName: addressOrName, blockTag: blockTag }).then(({ addressOrName, blockTag }) => {
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
    resolveName(name, blockTag) {
        return properties_1.resolveProperties({ name: name, blockTag: blockTag }).then(({ name, blockTag }) => {
            // If it is already an address, nothing to resolve
            try {
                return address_1.getAddress(name);
            }
            catch (error) { }
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
    lookupAddress(address, blockTag) {
        return properties_1.resolveProperties({ address: address, blockTag: blockTag }).then(({ address, blockTag }) => {
            if (address instanceof Promise) {
                return address.then((address) => {
                    return this.lookupAddress(address);
                });
            }
            address = address_1.getAddress(address);
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
    static checkTransactionReceipt(transaction) {
        return checkTransactionReceipt(transaction);
    }
    doPoll() {
    }
    perform(method, params) {
        errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
        return null;
    }
    checkResponseLog(method, result, code, message, params) {
        errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
        return null;
    }
    _startPending() {
        errors.warn('WARNING: this provider does not support pending events');
    }
    _stopPending() {
    }
    _addEventListener(eventName, listener, once) {
        this._events.push({
            tag: getEventTag(eventName),
            listener: listener,
            once: once,
        });
        if (eventName === 'pending') {
            this._startPending();
        }
        this.polling = true;
    }
    on(eventName, listener) {
        this._addEventListener(eventName, listener, false);
        return this;
    }
    once(eventName, listener) {
        this._addEventListener(eventName, listener, true);
        return this;
    }
    addEventListener(eventName, listener) {
        return this.on(eventName, listener);
    }
    emit(eventName, ...args) {
        let result = false;
        let eventTag = getEventTag(eventName);
        this._events = this._events.filter((event) => {
            if (event.tag !== eventTag) {
                return true;
            }
            setTimeout(() => {
                event.listener.apply(this, args);
            }, 0);
            result = true;
            return !(event.once);
        });
        if (this.listenerCount() === 0) {
            this.polling = false;
        }
        return result;
    }
    listenerCount(eventName) {
        if (!eventName) {
            return this._events.length;
        }
        let eventTag = getEventTag(eventName);
        return this._events.filter((event) => {
            return (event.tag === eventTag);
        }).length;
    }
    listeners(eventName) {
        let eventTag = getEventTag(eventName);
        return this._events.filter((event) => {
            return (event.tag === eventTag);
        }).map((event) => {
            return event.listener;
        });
    }
    removeAllListeners(eventName) {
        if (eventName == null) {
            this._events = [];
            this._stopPending();
        }
        else {
            let eventTag = getEventTag(eventName);
            this._events = this._events.filter((event) => {
                return (event.tag !== eventTag);
            });
            if (eventName === 'pending') {
                this._stopPending();
            }
        }
        if (this._events.length === 0) {
            this.polling = false;
        }
        return this;
    }
    removeListener(eventName, listener) {
        let found = false;
        let eventTag = getEventTag(eventName);
        this._events = this._events.filter((event) => {
            if (event.tag !== eventTag || event.listener != listener) {
                return true;
            }
            if (found) {
                return true;
            }
            found = true;
            return false;
        });
        if (eventName === 'pending' && this.listenerCount('pending') === 0) {
            this._stopPending();
        }
        if (this.listenerCount() === 0) {
            this.polling = false;
        }
        return this;
    }
    _doPoll() {
        this.getBlockNumber().then((blockNumber) => {
            this._setFastBlockNumber(blockNumber);
            // If the block hasn't changed, meh.
            if (blockNumber === this._lastBlockNumber) {
                return;
            }
            // First polling cycle, trigger a "block" events
            if (this._emitted.block === -2) {
                this._emitted.block = blockNumber - 1;
            }
            // Notify all listener for each block that has passed
            for (let i = this._emitted.block + 1; i <= blockNumber; i++) {
                this.emit('block', i);
            }
            // The emitted block was updated, check for obsolete events
            if (this._emitted.block !== blockNumber) {
                this._emitted.block = blockNumber;
                Object.keys(this._emitted).forEach((key) => {
                    // The block event does not expire
                    if (key === 'block') {
                        return;
                    }
                    // The block we were at when we emitted this event
                    let eventBlockNumber = this._emitted[key];
                    // We cannot garbage collect pending transactions or blocks here
                    // They should be garbage collected by the Provider when setting
                    // "pending" events
                    if (eventBlockNumber === 'pending') {
                        return;
                    }
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
            let newBalances = {};
            // Find all transaction hashes we are waiting on
            let uniqueEventTags = {};
            this._events.forEach((event) => {
                uniqueEventTags[event.tag] = true;
            });
            Object.keys(uniqueEventTags).forEach((tag) => {
                let comps = tag.split(':');
                switch (comps[0]) {
                    case 'tx': {
                        let hash = comps[1];
                        this.getTransactionReceipt(hash).then((receipt) => {
                            if (!receipt || receipt.blockNumber == null) {
                                return null;
                            }
                            receipt.hash = receipt.hash.toLowerCase();
                            this._emitted['t:' + hash] = receipt.blockNumber;
                            this.emit(hash, receipt);
                            return null;
                        }).catch((error) => {
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
                            if (lastBalance && balance.eq(lastBalance)) {
                                return;
                            }
                            this._balances[address] = balance;
                            this.emit(address, balance);
                            return null;
                        }).catch((error) => { this.emit('error', error); });
                        break;
                    }
                }
            });
            this._lastBlockNumber = blockNumber;
            this._balances = newBalances;
            return null;
        }).catch((error) => { });
        this.doPoll();
    }
    resetEventsBlock(blockNumber) {
        this._lastBlockNumber = blockNumber - 1;
        if (this.polling) {
            this._doPoll();
        }
    }
    get network() {
        return this._network;
    }
    getNetwork() {
        return this.ready;
    }
    get blockNumber() {
        return this._fastBlockNumber;
    }
    get polling() {
        return (this._poller != null);
    }
    set polling(value) {
        setTimeout(() => {
            if (value && !this._poller) {
                this._poller = setInterval(this._doPoll.bind(this), this.pollingInterval);
                this._doPoll();
            }
            else if (!value && this._poller) {
                clearInterval(this._poller);
                this._poller = null;
            }
        }, 0);
    }
    get pollingInterval() {
        return this._pollingInterval;
    }
    set pollingInterval(value) {
        if (typeof (value) !== 'number' || value <= 0 || parseInt(String(value)) != value) {
            throw new Error('invalid polling interval');
        }
        this._pollingInterval = value;
        if (this._poller) {
            clearInterval(this._poller);
            this._poller = setInterval(() => { this._doPoll(); }, this._pollingInterval);
        }
    }
    _getFastBlockNumber() {
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
    _setFastBlockNumber(blockNumber) {
        // Older block, maybe a stale request
        if (this._fastBlockNumber != null && blockNumber < this._fastBlockNumber) {
            return;
        }
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
    waitForTransaction(transactionHash, confirmations) {
        if (confirmations == null) {
            confirmations = 1;
        }
        return this.getTransactionReceipt(transactionHash).then((receipt) => {
            if (confirmations === 0 || (receipt && receipt.confirmations >= confirmations)) {
                return receipt;
            }
            return (new Promise((resolve) => {
                let handler = (receipt) => {
                    if (receipt.confirmations < confirmations) {
                        return;
                    }
                    this.removeListener(transactionHash, handler);
                    resolve(receipt);
                };
                this.on(transactionHash, handler);
            }));
        });
    }
}
exports.BaseProvider = BaseProvider;
function checkBlockTag(blockTag) {
    if (blockTag == null) {
        return '0';
    }
    if (blockTag === 'earliest') {
        return '0';
    }
    if (blockTag === 'latest' || blockTag === 'pending') {
        return "0";
    }
    if (bytes_1.isHexString(blockTag)) {
        return bignumber_1.bigNumberify(blockTag).toString();
    }
    try {
        if ('string' === typeof blockTag)
            return parseInt(blockTag).toString();
        return blockTag.toString();
    }
    catch (error) {
    }
    throw new Error('invalid blockTag');
}
properties_1.defineReadOnly(abstract_provider_1.Provider, 'inherits', properties_1.inheritable(abstract_provider_1.Provider));
//# sourceMappingURL=base-provider.js.map