'use strict';

// See: https://github.com/ethereum/wiki/wiki/JSON-RPC

import { BaseProvider } from './base-provider';

import * as errors from '../errors';

import { getNetwork } from '../utils/networks';
import { toUtf8String } from '../utils/utf8';
import { fetchJson, } from '../utils/web';
import { encode as base64Encode, decode as base64Decode } from '../utils/base64';

// Imported Types
import { Network, Networkish } from '../utils/networks';
import { ConnectionInfo } from '../utils/web';

import { isUndefinedOrNull, isUndefinedOrNullOrEmpty } from '../utils/misc';

function getResult(payload: { error?: { code?: number, data?: any, message?: string }, result?: any }): any {
    if (payload.error) {
        return payload.error;
    }
    return payload.result;
}

export class JsonRpcProvider extends BaseProvider {
    readonly connection: ConnectionInfo;

    constructor(url?: ConnectionInfo | string, network?: Networkish) {

        // One parameter, but it is a network name, so swap it with the URL
        if (typeof (url) === 'string') {
            if (network === null && getNetwork(url)) {
                network = url;
                url = null;
            }
        }

        if (network) {
            // The network has been specified explicitly, we can use it
            super(network);

        } else {
            // The network is unknown, query the JSON-RPC for it
            let ready: Promise<Network> = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.send('abci_info', []).then((result) => {
                        let chainId = 0;
                        if (result && result.response && result.response.data) {
                            chainId = result.response.data;
                        }
                        return resolve(getNetwork(chainId));
                    }).catch((error) => {
                        reject(error);
                    });
                });
            });
            super(ready);
        }

        errors.checkNew(this, JsonRpcProvider);

        // Default URL
        if (!url) { url = 'http://localhost:26657'; }

        if (typeof (url) === 'string') {
            this.connection = {
                url: url
            };
        } else {
            this.connection = url;
        }

        // Default request timeout
        if (!this.connection.timeout || 0 > this.connection.timeout) {
            this.connection.timeout = 60000;
        }
    }

    send(method: string, params: any): Promise<any> {
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

        return fetchJson(this.connection, null, JSON.stringify(request), getResult).then((result) => {
            this.emit('rpc', {
                action: 'response',
                request: request,
                response: result,
                provider: this
            });
            return result;
        });
    }

    perform(method: string, params: any): Promise<any> {
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
                return this.send('decoded_tx', [base64Encode(params.transactionHash), null]).then((result) => {
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
                                let value = toUtf8String(base64Decode(result.response.value));
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
                    if (!isUndefinedOrNullOrEmpty(result)) {
                        return result;
                    }
                    throw this.checkResponseLog(method, result, null);
                });

            case 'getKycAddress':
                return this.send('abci_query', ["/custom/kyc/get_kyc_address/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        try {
                            let value = "";

                            if (!isUndefinedOrNull(result.response.value)) {
                                value = toUtf8String(base64Decode(result.response.value));
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
                                let value = base64Decode(result.response.value);
                                return JSON.parse(toUtf8String(value));
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
                                let value = base64Decode(result.response.value);
                                return JSON.parse(toUtf8String(value));
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
                                let value = base64Decode(result.response.value);
                                return JSON.parse(toUtf8String(value));
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
                                let value = base64Decode(result.response.value);
                                return toUtf8String(value);
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
                                let value = base64Decode(result.response.value);
                                return toUtf8String(value);
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
                                let value = toUtf8String(base64Decode(result.response.value));
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
    checkResponseLog(method: string, result: any, code?: string, message?: string, params?: any): any {
        return checkResponseLog(this, method, result, isUndefinedOrNullOrEmpty(code) ? errors.UNEXPECTED_RESULT : code, message, params);
    }
}

function extractLog(log: any) {
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
            code: isUndefinedOrNullOrEmpty(log.code) ? -1 : log.code,
            codespace: isUndefinedOrNullOrEmpty(log.codespace) ? "" : log.codespace,
            message: isUndefinedOrNullOrEmpty(log.message) ? "" : log.message,
            log: JSON.stringify(log)
        }
    }
    return {
        code: -1,
        codespace: "",
        message: "",
        log: ("string" === typeof (log)) ? log : JSON.stringify(log)
    }
}

function checkResponseLog(self: JsonRpcProvider, method: string, result: any, defaultCode: string, defaultMessage: string, params: any): any {
    if (!params) { params = {}; }

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

                    case 3001: // Fee setting not found
                        return errors.createError('fee setting not found', errors.MISSING_FEES, { operation: method, info, response: result, params });
                    case 3002: // Token fee setting not found
                        return errors.createError('token fee setting not found', errors.MISSING_FEES, { operation: method, info, response: result, params });
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

        if (0 <= info.log.indexOf('Alias in used')) {
            return errors.createError('Alias in used', errors.EXISTS, { operation: method, info, response: result, params });
        }
        if (0 <= info.log.indexOf('Alias is in used')) {
            return errors.createError('"Alias is in used', errors.EXISTS, params);
        }
        if (0 <= info.log.indexOf('Not allowed to create new alias, you have pending alias approval')) {
            return errors.createError('Creation is not allowed due to pending approval', errors.NOT_ALLOWED, params);
        }
        // No such pending alias
        if (0 <= info.log.indexOf('No such pending alias')) {
            return errors.createError('No such pending alias', errors.NOT_FOUND, params);
        }
    }

    try {
        defaultMessage = info.code + ": " + (info.message ? info.message : "");
    }
    catch (error) { }

    if (!defaultCode) { defaultCode = errors.UNEXPECTED_RESULT; }
    if (!defaultMessage) { defaultMessage = "invalid json response"; }

    params = {
        operation: method,
        response: result,
        ...params
    }
    return errors.createError(defaultMessage, defaultCode, params);
}
