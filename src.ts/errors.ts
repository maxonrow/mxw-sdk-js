'use strict';

import { version } from "./mxw";

// Object not initialized
export const NOT_INITIALIZED = 'NOT_INITIALIZED';

// Transaction not found
//   - transaction: the transaction attempted
export const NOT_FOUND = 'NOT_FOUND';

// KYC registration is required
//   - transaction: the transaction attempted
export const KYC_REQUIRED = 'KYC_REQUIRED';

// Receiver KYC registration is required
export const RECEIVER_KYC_REQUIRED = 'RECEIVER_KYC_REQUIRED';

// Resources not available
//   - transaction: the transaction attempted
export const NOT_AVAILABLE = 'NOT_AVAILABLE';

// Action not allowed
//   - transaction: the transaction attempted
export const NOT_ALLOWED = 'NOT_ALLOWED';

// Action is forbidden
//   - transaction: the transaction attempted
export const FORBIDDEN = 'FORBIDDEN';

// Result is not matched expectation
//   - transaction: the transaction attempted
export const UNEXPECTED_RESULT = 'UNEXPECTED_RESULT';

// Resources not registered
//   - transaction: the transaction attempted
export const NOT_REGISTERED = 'NOT_REGISTERED';

// Resources is exists
//   - transaction: the transaction attempted
export const EXISTS = 'EXISTS';

// Invalid password
export const INVALID_PASSWORD = 'INVALID_PASSWORD';

// Invalid password
export const INVALID_ADDRESS = 'INVALID_ADDRESS';

// Connection Error
export const CONNECTION_ERROR = 'CONNECTION_ERROR';

// Unknown Error
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

// Not implemented
export const NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';

// Missing new operator to an object
//  - name: The name of the class
export const MISSING_NEW = 'MISSING_NEW';

// Call exception
//  - transaction: the transaction
//  - address?: the contract address
//  - args?: The arguments passed into the function
//  - method?: The Solidity method signature
//  - errorSignature?: The EIP848 error signature
//  - errorArgs?: The EIP848 error parameters
//  - reason: The reason (only for EIP848 "Error(string)")
export const CALL_EXCEPTION = 'CALL_EXCEPTION';

// Invalid argument (e.g. value is incompatible with type) to a function:
//   - argument: The argument name that was invalid
//   - value: The value of the argument
export const INVALID_ARGUMENT = 'INVALID_ARGUMENT';

// Missing argument to a function:
//   - count: The number of arguments received
//   - expectedCount: The number of arguments expected
export const MISSING_ARGUMENT = 'MISSING_ARGUMENT';

// Missing fees
export const MISSING_FEES = 'MISSING_FEES';

// Too many arguments
//   - count: The number of arguments received
//   - expectedCount: The number of arguments expected
export const UNEXPECTED_ARGUMENT = 'UNEXPECTED_ARGUMENT';

// Numeric Fault
//   - operation: the operation being executed
//   - fault: the reason this faulted
export const NUMERIC_FAULT = 'NUMERIC_FAULT';

// Insufficien funds
//   - transaction: the transaction attempted
export const INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS';

// Insufficien fees
//   - transaction: the transaction attempted
export const INSUFFICIENT_FEES = 'INSUFFICIENT_FEES';

// Nonce has already been used
//   - transaction: the transaction attempted
export const NONCE_EXPIRED = 'NONCE_EXPIRED';

// The replacement fee for the transaction is too low
//   - transaction: the transaction attempted
export const REPLACEMENT_UNDERPRICED = 'REPLACEMENT_UNDERPRICED';

// Unsupported operation
//   - operation
export const UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION';

// Invalid format
//   - value
//   - key
//   - object
export const INVALID_FORMAT = 'INVALID_FORMAT';

// Signature verification failed
//   - transaction: the transaction attempted
export const SIGNATURE_FAILED = 'SIGNATURE_FAILED';

let _permanentCensorErrors = false;
let _censorErrors = false;

export function throwError(message: string, code: string, params: any): never {
    throw createError(message, code, params);
}

// @TODO: Enum
export function createError(message: string, code: string, params: any): any {
    if (_censorErrors) {
        return new Error('unknown error');
    }

    if (!code) { code = UNKNOWN_ERROR; }
    if (!params) { params = {}; }

    let messageDetails: Array<string> = [];
    Object.keys(params).forEach((key) => {
        try {
            messageDetails.push(key + '=' + JSON.stringify(params[key]));
        } catch (error) {
            messageDetails.push(key + '=' + JSON.stringify(params[key].toString()));
        }
    });
    messageDetails.push("version=" + version);

    let reason = message;
    if (messageDetails.length) {
        message += ' (' + messageDetails.join(', ') + ')';
    }

    // @TODO: Any??
    let error: any = new Error(message);
    error.reason = reason;
    error.code = code

    Object.keys(params).forEach(function (key) {
        error[key] = params[key];
    });

    return error;
}

export function checkNew(self: any, kind: any): void {
    if (!(self instanceof kind)) {
        throwError('missing new', MISSING_NEW, { name: kind.name });
    }
}

export function checkArgumentCount(count: number, expectedCount: number, suffix?: string): void {
    if (!suffix) { suffix = ''; }
    if (count < expectedCount) {
        throwError('missing argument' + suffix, MISSING_ARGUMENT, { count: count, expectedCount: expectedCount });
    }
    if (count > expectedCount) {
        throwError('too many arguments' + suffix, UNEXPECTED_ARGUMENT, { count: count, expectedCount: expectedCount });
    }
}

export function setCensorship(censorship: boolean, permanent?: boolean): void {
    if (_permanentCensorErrors) {
        throwError('error censorship permanent', UNSUPPORTED_OPERATION, { operation: 'setCensorship' });
    }

    _censorErrors = !!censorship;
    _permanentCensorErrors = !!permanent;
}

export function checkNormalize(): void {
    try {
        // Make sure all forms of normalization are supported
        ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
            try {
                "test".normalize(form);
            } catch (error) {
                throw new Error('missing ' + form);
            }
        });

        if (String.fromCharCode(0xe9).normalize('NFD') !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error('broken implementation')
        }
    } catch (error) {
        throwError('platform missing String.prototype.normalize', UNSUPPORTED_OPERATION, { operation: 'String.prototype.normalize', form: error.message });
    }
}

const LogLevels: { [name: string]: number } = { debug: 1, normal: 2, info: 2, warn: 3, error: 4, off: 5 };
let LogLevel = LogLevels["normal"];

export function setLogLevel(logLevel: string): void {
    let level = LogLevels[logLevel];
    if (level == null) {
        warn("invliad log level - " + logLevel);
        return;
    }
    LogLevel = level;
}

function log(logLevel: string, args: Array<any>): void {
    if (LogLevel > LogLevels[logLevel]) { return; }
    console.log.apply(console, args);
}

export function error(...args: Array<any>): void {
    log("error", args);
}

export function warn(...args: Array<any>): void {
    log("warn", args);
}

export function info(...args: Array<any>): void {
    log("info", args);
}

export function normal(...args: Array<any>): void {
    log("normal", args);
}

export function debug(...args: Array<any>): void {
    log("debug", args);
}
