'use strict';

import axios, { AxiosResponse, AxiosError } from 'axios';

import { encode as base64Encode } from './base64';
import { shallowCopy } from './properties';
import { toUtf8Bytes } from './utf8';

import * as errors from '../errors';


// Exported Types
export type ConnectionInfo = {
    url: string,
    user?: string,
    password?: string,
    allowInsecure?: boolean,
    timeout?: number,
    headers?: { [key: string]: string | number },
    pollingInterval?: number
};

export interface OnceBlockable {
    once(eventName: "block", handler: () => void): void;
}

export type PollOptions = {
    timeout?: number,
    floor?: number,
    ceiling?: number,
    interval?: number,
    onceBlock?: OnceBlockable,
    fastRetry?: number
};

type Header = { key: string, value: string };

export function fetchJson(connection: string | ConnectionInfo, path: string, json: any, processFunc: (value: any) => any): Promise<any> {
    let headers: { [key: string]: Header } = {};

    let url: string = null;

    let timeout = 2 * 60 * 1000;

    if (typeof (connection) === 'string') {
        url = connection;

    } else if (typeof (connection) === 'object') {
        if (connection.url == null) {
            errors.throwError('missing URL', errors.MISSING_ARGUMENT, { arg: 'url' });
        }

        url = connection.url;

        if (typeof (connection.timeout) === 'number' && connection.timeout > 0) {
            timeout = connection.timeout;
        }

        if (connection.headers) {
            for (let key in connection.headers) {
                headers[key.toLowerCase()] = { key: key, value: String(connection.headers[key]) };
            }
        }

        if (connection.user != null && connection.password != null) {
            if (url.substring(0, 6) !== 'https:' && connection.allowInsecure !== true) {
                errors.throwError(
                    'basic authentication requires a secure https url',
                    errors.INVALID_ARGUMENT,
                    { arg: 'url', url: url, user: connection.user, password: '[REDACTED]' }
                );
            }

            let authorization = connection.user + ':' + connection.password;
            headers['authorization'] = {
                key: 'Authorization',
                value: 'Basic ' + base64Encode(toUtf8Bytes(authorization))
            };
        }
    }
    if (path) {
        url += path;
    }
    let responseHandler = function (error: AxiosError, response: AxiosResponse) {
        if (error || !response) {
            errors.throwError(
                'connection error', errors.CONNECTION_ERROR,
                { url, response: (null != response) ? response.data : null, error }
            );
        }

        if (200 != response.status) {
            errors.throwError(
                'invalid response - ' + response.status, errors.UNEXPECTED_RESULT,
                { url, statusCode: response.status, responseText: response.data, request: json }
            );
        }

        let result = response.data;

        if (processFunc) {
            try {
                result = processFunc(result);
            } catch (error) {
                error.url = url;
                error.body = json;
                error.responseText = response.data;
                throw error;
            }
        }

        return Promise.resolve(result);
    };

    let client = axios.create({
        timeout: timeout,
        headers: headers
    });

    if (!json) {
        return client.get(url).then((response) => {
            return responseHandler(undefined, response);
        }).catch(error => {
            return responseHandler(error, undefined);
        });
    }

    return client.post(url, json).then((response) => {
        return responseHandler(undefined, response);
    }).catch(error => {
        return responseHandler(error, undefined);
    });
}

export function poll(func: () => Promise<any>, options?: PollOptions): Promise<any> {
    if (!options) { options = {}; }
    options = shallowCopy(options);
    if (options.floor == null) { options.floor = 0; }
    if (options.ceiling == null) { options.ceiling = 10000; }
    if (options.interval == null) { options.interval = 250; }

    return new Promise(function (resolve, reject) {

        let timer: any = null;
        let done: boolean = false;

        // Returns true if cancel was successful. Unsuccessful cancel means we're already done.
        let cancel = (): boolean => {
            if (done) { return false; }
            done = true;
            if (timer) { clearTimeout(timer); }
            return true;
        };

        if (options.timeout) {
            timer = setTimeout(() => {
                if (cancel()) { reject(new Error('timeout')); }
            }, options.timeout)
        }

        let fastTimeout = options.fastRetry || null;

        let attempt = 0;
        function check() {
            return func().then(function (result) {

                // If we have a result, or are allowed null then we're done
                if (result !== undefined) {
                    if (cancel()) { resolve(result); }

                } else if (options.onceBlock) {
                    options.onceBlock.once('block', check);

                    // Otherwise, exponential back-off (up to 10s) our next request
                } else if (!done) {
                    attempt++;

                    let timeout = options.interval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                    if (timeout < options.floor) { timeout = options.floor; }
                    if (timeout > options.ceiling) { timeout = options.ceiling; }

                    // Fast Timeout, means we quickly try again the first time
                    if (fastTimeout) {
                        attempt--;
                        timeout = fastTimeout;
                        fastTimeout = null;
                    }

                    setTimeout(check, timeout);
                }

                return null;
            }, function (error) {
                if (cancel()) { reject(error); }
            });
        }
        check();
    });
}

