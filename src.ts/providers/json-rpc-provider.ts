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
                    throw this.checkResponseLog(method, null, result);
                });

            case 'sendTransactionAsync':
                return this.send('encode_and_broadcast_tx_async', [params.signedTransaction]).then((result) => {
                    if (0 == result.code) {
                        if (result.hash) {
                            result.hash = "0x" + result.hash;
                            return result;
                        }
                    }
                    throw this.checkResponseLog(method, null, result);
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

                    let returnError = this.checkResponseLog(method, null, result);
                    if (errors.NOT_FOUND == returnError.code) {
                        return null;
                    }
                    throw returnError;
                });

            case 'getTransactionFee':
                return this.send('query_fee', [params.unsignedTransaction]).then(result => {
                    return result;
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
                    throw this.checkResponseLog(method, null, result);
                });

            case 'getBlock':
                if ("0" == params.blockTag) {
                    return this.getBlockNumber().then((blockNumber) => {
                        params.blockTag = blockNumber.toString();
                        return this.perform(method, params);
                    });
                }
                return this.send('block_results', [params.blockTag]).then(result => {
                    if (!result.results) {
                        let returnError = this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
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
                    throw this.checkResponseLog(method, null, result);
                });

            case 'getStatus':
                return this.send('status', []);

            default:
                break;
        }

        return errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
    }

    private checkResponseLog(method: string, log: string, result: any, params?: any): any {
        return checkResponseLog(method, result, errors.UNEXPECTED_RESULT, "", params);
    }
}
//throw this.checkResponseLog(method, null, result);
//private checkResponseLog(method: string, log: string, result: any, info?: any): any {
function checkResponseLog(method: string, result: any, code: string, message: string, params: any): any {
    if (!params) { params = {}; }

    let log = "";

    if (result) {
        if (result.tx_result && result.tx_result.log) {
            log = result.tx_result.log;
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
                }
            }
        }
    }

    if (log) {
        // "transaction not found"
        if (0 <= log.indexOf(') not found') && log.startsWith("Tx (")) {
            return errors.createError('transaction not found', errors.NOT_FOUND, { operation: method, response: result });
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
        // Height must be less than or equal to the current blockchain height
        if (0 <= log.indexOf('Height must be less than or equal to the current blockchain height')) {
            return errors.createError('block not found', errors.NOT_FOUND, { operation: method, response: result });
        }

        // // "Token already exists"
        // if (0 <= log.indexOf('Token already exists')) {
        //     return errors.createError('token is already exists', errors.EXISTS, { operation: method, response: result });
        // }
        // // "No such token"
        // if (0 <= log.indexOf('No such token')) {
        //     return errors.createError('token is not found', errors.NOT_FOUND, { operation: method, response: result });
        // }
        // if (0 <= log.indexOf('Alias in used')) {
        //     return errors.createError('Alias in used', errors.EXISTS, { operation: method, response: result });
        // }
        // if (0 <= log.indexOf('Alias is in used')) {
        //     return errors.createError('"Alias is in used', errors.EXISTS, params);
        // }
        // if (0 <= log.indexOf('Not allowed to create new alias, you have pending alias approval')) {
        //     return errors.createError('Creation is not allowed due to pending approval', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Token does not exist')) {
        //     return errors.createError('Token does not exist', errors.NOT_FOUND, params);
        // }
        // if (0 <= log.indexOf('Token class already exists')) {
        //     return errors.createError('duplicated token class', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Token is already approved')) {
        //     return errors.createError('Token is already approved', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Token already exists')) {
        //     return errors.createError('Duplicated token', errors.EXISTS, params);
        // }
        // if (0 <= log.indexOf('Token is not burnable')) {
        //     return errors.createError('Token is not burnable', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Fungible token is not frozen')) {
        //     return errors.createError('Fungible token is not frozen', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Fungible token already frozen')) {
        //     return errors.createError('Fungible token already frozen', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Fungible token account not frozen')) {
        //     return errors.createError('Fungible token account not frozen', errors.NOT_ALLOWED, params);
        // }
        // if (0 <= log.indexOf('Fungible token account already frozen')) {
        //     return errors.createError('Fungible token account already frozen', errors.NOT_ALLOWED, params);
        // }
    }

    try {
        let l = JSON.parse(log);
        message = l.code + ": " + l.message;
    }
    catch (error) { }

    if (!code) { code = errors.UNEXPECTED_RESULT; }
    if (!message) { message = "invalid json response"; }

    params = {
        operation: method,
        response: result,
        ...params
    }
    return errors.createError(message, code, params);
}
