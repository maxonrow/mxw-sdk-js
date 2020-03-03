'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// See: https://github.com/ethereum/wiki/wiki/JSON-RPC
const base_provider_1 = require("./base-provider");
const errors = __importStar(require("../errors"));
const networks_1 = require("../utils/networks");
const utf8_1 = require("../utils/utf8");
const web_1 = require("../utils/web");
const base64_1 = require("../utils/base64");
const misc_1 = require("../utils/misc");
function getResult(payload) {
    if (payload.error) {
        return payload.error;
    }
    return payload.result;
}
class JsonRpcProvider extends base_provider_1.BaseProvider {
    constructor(url, network) {
        // One parameter, but it is a network name, so swap it with the URL
        if (typeof (url) === 'string') {
            if (network === null && networks_1.getNetwork(url)) {
                network = url;
                url = null;
            }
        }
        if (network) {
            // The network has been specified explicitly, we can use it
            super(network);
        }
        else {
            // The network is unknown, query the JSON-RPC for it
            let ready = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.send('abci_info', []).then((result) => {
                        let chainId = 0;
                        if (result && result.response && result.response.data) {
                            chainId = result.response.data;
                        }
                        return resolve(networks_1.getNetwork(chainId));
                    }).catch((error) => {
                        reject(error);
                    });
                });
            });
            super(ready);
        }
        errors.checkNew(this, JsonRpcProvider);
        // Default URL
        if (!url) {
            url = 'http://localhost:26657';
        }
        if (typeof (url) === 'string') {
            this.connection = {
                url: url
            };
        }
        else {
            this.connection = url;
        }
        // Default request timeout
        if (!this.connection.timeout || 0 > this.connection.timeout) {
            this.connection.timeout = 60000;
        }
    }
    send(method, params) {
        let request = {
            method: method,
            params: params,
            id: 42,
            jsonrpc: "2.0"
        };
        this.emit('rpc', {
            action: 'request',
            request: request,
            provider: this
        });
        return web_1.fetchJson(this.connection, null, JSON.stringify(request), getResult).then((result) => {
            this.emit('rpc', {
                action: 'response',
                request: request,
                response: result,
                provider: this
            });
            return result;
        });
    }
    perform(method, params) {
        switch (method) {
            case 'sendTransaction':
                return this.send('encode_and_broadcast_tx_sync', [params.signedTransaction]).then((result) => {
                    if (0 == result.code) {
                        if (result.hash) {
                            result.hash = "0x" + result.hash;
                            return result;
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'sendTransactionAsync':
                return this.send('encode_and_broadcast_tx_async', [params.signedTransaction]).then((result) => {
                    if (0 == result.code) {
                        if (result.hash) {
                            result.hash = "0x" + result.hash;
                            return result;
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getTransaction':
            case 'getTransactionReceipt':
                return this.send('decoded_tx', [base64_1.encode(params.transactionHash), null]).then((result) => {
                    // errors.debug("RECEIPT:", JSON.stringify(result));
                    if (result.tx_result && result.tx_result.log) {
                        try {
                            result.status = 0;
                            let logs = JSON.parse(result.tx_result.log);
                            if (0 < logs.length && "boolean" === typeof logs[0].success) {
                                if (logs[0].success) {
                                    result.status = 1;
                                }
                            }
                            return result;
                        }
                        catch (error) {
                        }
                    }
                    let returnError = this.checkResponseLog(method, result, null);
                    if (errors.NOT_FOUND == returnError.code) {
                        return null;
                    }
                    throw returnError;
                });
            case 'getTransactionFee':
                return this.send('query_fee', [params.unsignedTransaction]).then(result => {
                    if (result && result.amount) {
                        return result;
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getTransactionFeeSetting':
                return this.send('abci_query', [params.path, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = utf8_1.toUtf8String(base64_1.decode(result.response.value));
                                return JSON.parse(value);
                            }
                            catch (error) {
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getBlock':
                if ("0" == params.blockTag) {
                    return this.getBlockNumber().then((blockNumber) => {
                        params.blockTag = blockNumber.toString();
                        return this.perform(method, params);
                    });
                }
                return this.send('block_results', [params.blockTag]).then(result => {
                    if (!result || !result.results) {
                        let returnError = this.checkResponseLog(method, result, null);
                        if (errors.NOT_FOUND != returnError.code) {
                            throw returnError;
                        }
                        result = null;
                    }
                    return result;
                });
            case 'getBlockInfo':
                if ("0" == params.blockTag) {
                    return this.getBlockNumber().then((blockNumber) => {
                        params.blockTag = blockNumber.toString();
                        return this.perform(method, params);
                    });
                }
                return this.send('block', [params.blockTag]).then(result => {
                    if (!result || !result.block) {
                        let returnError = this.checkResponseLog(method, result, null);
                        if (errors.NOT_FOUND != returnError.code) {
                            throw returnError;
                        }
                        result = null;
                    }
                    return result;
                });
            case 'getBlockNumber':
                return this.send('latest_block_height', []);
            case 'isWhitelisted':
                return this.send('is_whitelisted', [params.address]).then(result => {
                    if (!misc_1.isUndefinedOrNullOrEmpty(result)) {
                        return result;
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getKycAddress':
                return this.send('abci_query', ["/custom/kyc/get_kyc_address/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        try {
                            let value = "";
                            if (!misc_1.isUndefinedOrNull(result.response.value)) {
                                value = utf8_1.toUtf8String(base64_1.decode(result.response.value));
                            }
                            if ("" === value) {
                                value = "0000000000000000000000000000000000000000000000000000000000000000";
                            }
                            return value;
                        }
                        catch (error) {
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getTokenState':
                return this.send('abci_query', ["/custom/token/token_data/" + params.symbol, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return JSON.parse(utf8_1.toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getTokenList':
                return this.send('abci_query', ["/custom/token/list-token-symbol", "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return JSON.parse(utf8_1.toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getTokenAccountState':
                return this.send('abci_query', ["/custom/token/account/" + params.symbol + "/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return JSON.parse(utf8_1.toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getAccountState':
                return this.send('account', [params.address]).then(result => {
                    if (result) {
                        try {
                            return JSON.parse(result);
                        }
                        catch (error) { }
                        return null;
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getNFTokenState':
                return this.send('abci_query', ["/custom/nonFungible/token_data/" + params.symbol, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return JSON.parse(utf8_1.toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'getNFTokenItemState':
                return this.send('abci_query', ["/custom/nonFungible/item_data/" + params.symbol + "/" + params.itemID, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return JSON.parse(utf8_1.toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
                });
            case 'resolveName':
                return this.send('abci_query', ["/custom/nameservice/resolve/" + params.name, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return utf8_1.toUtf8String(value);
                            }
                            catch (error) {
                            }
                        }
                    }
                    let error = this.checkResponseLog(method, result, null);
                    if (error && errors.NOT_FOUND == error.code) {
                        return null;
                    }
                    throw error;
                });
            case 'lookupAddress':
                return this.send('abci_query', ["/custom/nameservice/whois/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64_1.decode(result.response.value);
                                return utf8_1.toUtf8String(value);
                            }
                            catch (error) {
                            }
                        }
                    }
                    let error = this.checkResponseLog(method, result, null);
                    if (error && errors.NOT_FOUND == error.code) {
                        return null;
                    }
                    throw error;
                });
            case 'getAliasState':
                return this.send('abci_query', ["/custom/nameservice/pending/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = utf8_1.toUtf8String(base64_1.decode(result.response.value));
                                return JSON.parse(value);
                            }
                            catch (error) {
                            }
                        }
                    }
                    let error = this.checkResponseLog(method, result, null);
                    if (error && errors.NOT_FOUND == error.code) {
                        return null;
                    }
                    throw error;
                });
            case 'getStatus':
                return this.send('status', []);
            default:
                break;
        }
        return errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
    }
    // checkResponseLog(method: string, log: string, result: any, params?: any): any {
    checkResponseLog(method, result, code, message, params) {
        return checkResponseLog(this, method, result, misc_1.isUndefinedOrNullOrEmpty(code) ? errors.UNEXPECTED_RESULT : code, message, params);
    }
}
exports.JsonRpcProvider = JsonRpcProvider;
function extractLog(log) {
    while ("string" === typeof (log)) {
        try {
            log = JSON.parse(log);
        }
        catch (error) {
            break;
        }
    }
    if ("object" === typeof (log)) {
        return {
            code: misc_1.isUndefinedOrNullOrEmpty(log.code) ? -1 : log.code,
            codespace: misc_1.isUndefinedOrNullOrEmpty(log.codespace) ? "" : log.codespace,
            message: misc_1.isUndefinedOrNullOrEmpty(log.message) ? "" : log.message,
            log: JSON.stringify(log)
        };
    }
    return {
        code: -1,
        codespace: "",
        message: "",
        log: ("string" === typeof (log)) ? log : JSON.stringify(log)
    };
}
function checkResponseLog(self, method, result, defaultCode, defaultMessage, params) {
    if (!params) {
        params = {};
    }
    let info = {
        code: -1,
        codespace: "",
        message: "",
        log: ""
    };
    if (result) {
        if (result.tx_result && result.tx_result.log) {
            info.log = result.tx_result.log;
        }
        else {
            if (result.log) {
                info.log = result.log;
            }
            else {
                if (result.data) {
                    info.log = result.data;
                }
                else {
                    if (result.response && result.response.log) {
                        info.log = result.response.log;
                    }
                    else {
                        if (result.result && result.result.logs && Array.isArray(result.result.logs)) {
                            if (result.result.logs[0] && result.result.logs[0].info && result.result.logs[0].info.message) {
                                info.log = result.result.logs[0].info.message;
                            }
                        }
                    }
                }
            }
        }
    }
    if (info.log) {
        info = extractLog(info.log);
    }
    self.emit('responseLog', {
        action: 'checkResponseLog',
        response: result,
        info,
        defaultCode,
        defaultMessage,
        params
    });
    if (info.codespace && info.code) {
        switch (info.codespace) {
            case "sdk":
                switch (info.code) {
                    case 4: // signature verification failed
                        return errors.createError('signature verification failed', errors.SIGNATURE_FAILED, { operation: method, info, response: result, params });
                    case 5: // CodeInsufficientFunds
                    case 10: // CodeInsufficientCoins
                        return errors.createError('insufficient funds', errors.INSUFFICIENT_FUNDS, { operation: method, info, response: result, params });
                    case 11: // Invalid amount
                        return errors.createError('invalid amount', errors.NUMERIC_FAULT, { operation: method, info, response: result, params });
                    case 14: // CodeInsufficientFee
                        return errors.createError('insufficient fees', errors.INSUFFICIENT_FEES, { operation: method, info, response: result, params });
                }
                break;
            case "mxw":
                switch (info.code) {
                    case 1000: // KYC registration is required
                        return errors.createError('KYC registration is required', errors.KYC_REQUIRED, { operation: method, info, response: result, params });
                    case 1001: // KYC address duplicated
                        return errors.createError('Duplicated KYC', errors.EXISTS, { operation: method, info, response: result, params });
                    case 2001: // Token already exists
                        return errors.createError('token exists', errors.EXISTS, { operation: method, info, response: result, params });
                    case 2002: // Token does not exists
                        return errors.createError('token not found', errors.NOT_FOUND, { operation: method, info, response: result, params });
                    case 2003: // Token is already approved
                        return errors.createError('token is already approved', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2004: // Token is frozen
                        return errors.createError('token is frozen', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2005: // Token already unfrozen
                        return errors.createError('token already unfrozen', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2006: // Invalid token
                        return errors.createError('invalid token', errors.NOT_AVAILABLE, { operation: method, info, response: result, params });
                    case 2007: // Token account frozen
                        return errors.createError('token account is frozen', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2008: // Token account already Unfrozen
                        return errors.createError('token account already unfrozen', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2009: // Invalid token minter
                        return errors.createError('invalid token minter', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2099: // Invalid token supply
                        return errors.createError('exceeded maximum token supply', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2100: // Insufficient token
                        return errors.createError('insufficient token', errors.INSUFFICIENT_FUNDS, { operation: method, info, response: result, params });
                    case 2101: // Invalid token action
                        return errors.createError('invalid token action', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2102: // Invalid token new owner
                        return errors.createError('invalid new token owner', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2103: // Invalid token owner
                        return errors.createError('invalid token owner', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 2104: // Transfer token ownership approved
                        return errors.createError('Token ownership is already approved', errors.EXISTS, { operation: method, info, response: result, params });
                    case 3001: // Fee setting not found
                        return errors.createError('fee setting not found', errors.MISSING_FEES, { operation: method, info, response: result, params });
                    case 3002: // Token fee setting not found
                        return errors.createError('token fee setting not found', errors.MISSING_FEES, { operation: method, info, response: result, params });
                    case 4001: // Alias in used
                        return errors.createError('alias in used', errors.EXISTS, { operation: method, info, response: result, params });
                    case 4002: // No such pending alias
                        return errors.createError('no such pending alias', errors.NOT_FOUND, { operation: method, info, response: result, params });
                    case 4003: // Alias not allowed to create
                        return errors.createError('not allowed to create alias', errors.NOT_ALLOWED, { operation: method, info, response: result, params });
                    case 4004: // Alias not found
                        return errors.createError('alias not found', errors.NOT_FOUND, { operation: method, info, response: result, params });
                    case 4005: // Could not resolve address
                        return errors.createError('could not resolve address', errors.NOT_FOUND, { operation: method, info, response: result, params });
                }
        }
    }
    if (info.log) {
        // "transaction not found"
        if (0 <= info.log.indexOf(') not found') && info.log.startsWith("Tx (")) {
            return errors.createError('transaction not found', errors.NOT_FOUND, { operation: method, info, response: result, params });
        }
        // Height must be less than or equal to the current blockchain height
        // Could not find results for height #
        if (0 <= info.log.indexOf('Height must be less than or equal to the current blockchain height') || 0 <= info.log.indexOf("Could not find results for height #")) {
            return errors.createError('block not found', errors.NOT_FOUND, { operation: method, info, response: result, params });
        }
    }
    try {
        defaultMessage = info.code + ": " + (info.message ? info.message : "");
    }
    catch (error) { }
    if (!defaultCode) {
        defaultCode = errors.UNEXPECTED_RESULT;
    }
    if (!defaultMessage) {
        defaultMessage = "invalid json response";
    }
    params = Object.assign({ operation: method, response: result }, params);
    return errors.createError(defaultMessage, defaultCode, params);
}
//# sourceMappingURL=json-rpc-provider.js.map