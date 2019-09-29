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
                        else {
                            switch (result.response.code) {
                                case 6: // could not resolve name
                                case 7: // name not set
                                    return null;
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
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
                        else {
                            switch (result.response.code) {
                                case 6: // could not resolve address
                                case 7: // address not set
                                    return null;
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
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
                        else {
                            switch (result.response.code) {
                                case 6: // could not resolve address
                                case 7: // address not set
                                    return null;
                            }
                        }
                    }
                    throw this.checkResponseLog(method, result, null);
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
        return checkResponseLog(method, result, misc_1.isUndefinedOrNullOrEmpty(code) ? errors.UNEXPECTED_RESULT : code, message, params);
    }
}
exports.JsonRpcProvider = JsonRpcProvider;
function checkResponseLog(method, result, code, message, params) {
    if (!params) {
        params = {};
    }
    let log = "";
    if (result) {
        if (result.tx_result && result.tx_result.log) {
            try {
                log = JSON.parse(result.tx_result.log);
            }
            catch (error) {
                log = result.tx_result.log;
            }
        }
        else {
            if (result.log) {
                log = result.log;
            }
            else {
                if (result.data) {
                    log = result.data;
                }
                else {
                    if (result.response && result.response.log) {
                        log = result.response.log;
                    }
                    else {
                        if (result.result && result.result.logs && Array.isArray(result.result.logs)) {
                            if (result.result.logs[0] && result.result.logs[0].info && result.result.logs[0].info.message) {
                                log = result.result.logs[0].info.message;
                            }
                        }
                    }
                }
            }
        }
    }
    if (log) {
        // "transaction not found"
        if (0 <= log.indexOf(') not found') && log.startsWith("Tx (")) {
            return errors.createError('transaction not found', errors.NOT_FOUND, { operation: method, response: result });
        }
        // Height must be less than or equal to the current blockchain height
        // Could not find results for height #
        if (0 <= log.indexOf('Height must be less than or equal to the current blockchain height') || 0 <= log.indexOf("Could not find results for height #")) {
            return errors.createError('block not found', errors.NOT_FOUND, { operation: method, response: result });
        }
        // "KYC registration is required"
        if (0 <= log.indexOf('"codespace":"mxw","code":1000,')) {
            return errors.createError('KYC registration is required', errors.KYC_REQUIRED, { operation: method, response: result });
        }
        // "KYC address duplicated"
        if (0 <= log.indexOf('"codespace":"mxw","code":1001,')) {
            return errors.createError('Duplicated KYC', errors.EXISTS, { operation: method, response: result });
        }
        // 5: CodeInsufficientFunds, 10: CodeInsufficientCoins
        if (0 <= log.indexOf('"codespace":"sdk","code":5,') || 0 <= log.indexOf('"codespace":"sdk","code":10,')) {
            return errors.createError('insufficient funds', errors.INSUFFICIENT_FUNDS, params);
        }
        // 14: CodeInsufficientFee
        if (0 <= log.indexOf('"codespace":"sdk","code":14,')) {
            return errors.createError('insufficient fees', errors.INSUFFICIENT_FEES, params);
        }
        // Invalid amount
        if (0 <= log.indexOf('"codespace":"sdk","code":11,')) {
            return errors.createError('invalid amount', errors.NUMERIC_FAULT, { operation: method, response: result });
        }
        // signature verification failed
        if (0 <= log.indexOf('"codespace":"sdk","code":4,')) {
            return errors.createError('signature verification failed', errors.SIGNATURE_FAILED, { operation: method, response: result });
        }
        // Token already exists
        if (0 <= log.indexOf('"codespace":"mxw","code":2001,')) {
            return errors.createError('token exists', errors.EXISTS, { operation: method, response: result });
        }
        // Token does not exists
        if (0 <= log.indexOf('"codespace":"mxw","code":2002,')) {
            return errors.createError('token not found', errors.NOT_FOUND, { operation: method, response: result });
        }
        // Token is already approved
        if (0 <= log.indexOf('"codespace":"mxw","code":2003,')) {
            return errors.createError('token is already approved', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Token is frozen
        if (0 <= log.indexOf('"codespace":"mxw","code":2004,')) {
            return errors.createError('token is frozen', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Token already unfrozen
        if (0 <= log.indexOf('"codespace":"mxw","code":2005,')) {
            return errors.createError('token already unfrozen', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Invalid token
        if (0 <= log.indexOf('"codespace":"mxw","code":2006,')) {
            return errors.createError('invalid token', errors.NOT_AVAILABLE, { operation: method, response: result });
        }
        // Token account frozen
        if (0 <= log.indexOf('"codespace":"mxw","code":2007,')) {
            return errors.createError('token account is frozen', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Token account already Unfrozen
        if (0 <= log.indexOf('"codespace":"mxw","code":2008,')) {
            return errors.createError('token account already unfrozen', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Invalid token minter
        if (0 <= log.indexOf('"codespace":"mxw","code":2009,')) {
            return errors.createError('invalid token minter', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Invalid token supply
        if (0 <= log.indexOf('"codespace":"mxw","code":2099,')) {
            return errors.createError('exceeded maximum token supply', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Insufficient token
        if (0 <= log.indexOf('"codespace":"mxw","code":2100,')) {
            return errors.createError('insufficient token', errors.INSUFFICIENT_FUNDS, { operation: method, response: result });
        }
        // Fee setting not found
        if (0 <= log.indexOf('Fee setting not found')) {
            return errors.createError('fee setting not found', errors.NOT_ALLOWED, { operation: method, response: result });
        }
        // Token fee setting not found
        if (0 <= log.indexOf('"codespace":"mxw","code":3002,')) {
            return errors.createError('token fee setting not found', errors.NOT_AVAILABLE, { operation: method, response: result });
        }
        // if (0 <= log.indexOf('Alias in used')) {
        //     return errors.createError('Alias in used', errors.EXISTS, { operation: method, response: result });
        // }
        // if (0 <= log.indexOf('Alias is in used')) {
        //     return errors.createError('"Alias is in used', errors.EXISTS, params);
        // }
        // if (0 <= log.indexOf('Not allowed to create new alias, you have pending alias approval')) {
        //     return errors.createError('Creation is not allowed due to pending approval', errors.NOT_ALLOWED, params);
        // }
    }
    try {
        let l = JSON.parse(log);
        message = l.code + ": " + l.message;
    }
    catch (error) { }
    if (!code) {
        code = errors.UNEXPECTED_RESULT;
    }
    if (!message) {
        message = "invalid json response";
    }
    params = Object.assign({ operation: method, response: result }, params);
    return errors.createError(message, code, params);
}
//# sourceMappingURL=json-rpc-provider.js.map