'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNATURE_FAILED = exports.INVALID_FORMAT = exports.UNSUPPORTED_OPERATION = exports.REPLACEMENT_UNDERPRICED = exports.NONCE_EXPIRED = exports.INSUFFICIENT_FEES = exports.INSUFFICIENT_FUNDS = exports.NUMERIC_FAULT = exports.UNEXPECTED_ARGUMENT = exports.MISSING_FEES = exports.MISSING_ARGUMENT = exports.INVALID_ARGUMENT = exports.CALL_EXCEPTION = exports.MISSING_NEW = exports.NOT_IMPLEMENTED = exports.UNKNOWN_ERROR = exports.CONNECTION_ERROR = exports.INVALID_ADDRESS = exports.INVALID_PASSWORD = exports.EXISTS = exports.NOT_REGISTERED = exports.UNEXPECTED_RESULT = exports.FORBIDDEN = exports.NOT_ALLOWED = exports.NOT_AVAILABLE = exports.RECEIVER_KYC_REQUIRED = exports.KYC_REQUIRED = exports.NOT_FOUND = exports.NOT_INITIALIZED = void 0;
exports.throwError = throwError;
exports.createError = createError;
exports.checkNew = checkNew;
exports.checkArgumentCount = checkArgumentCount;
exports.setCensorship = setCensorship;
exports.checkNormalize = checkNormalize;
exports.setLogLevel = setLogLevel;
exports.error = error;
exports.warn = warn;
exports.info = info;
exports.normal = normal;
exports.debug = debug;
const mxw_1 = require("./mxw");
// Object not initialized
exports.NOT_INITIALIZED = 'NOT_INITIALIZED';
// Transaction not found
//   - transaction: the transaction attempted
exports.NOT_FOUND = 'NOT_FOUND';
// KYC registration is required
//   - transaction: the transaction attempted
exports.KYC_REQUIRED = 'KYC_REQUIRED';
// Receiver KYC registration is required
exports.RECEIVER_KYC_REQUIRED = 'RECEIVER_KYC_REQUIRED';
// Resources not available
//   - transaction: the transaction attempted
exports.NOT_AVAILABLE = 'NOT_AVAILABLE';
// Action not allowed
//   - transaction: the transaction attempted
exports.NOT_ALLOWED = 'NOT_ALLOWED';
// Action is forbidden
//   - transaction: the transaction attempted
exports.FORBIDDEN = 'FORBIDDEN';
// Result is not matched expectation
//   - transaction: the transaction attempted
exports.UNEXPECTED_RESULT = 'UNEXPECTED_RESULT';
// Resources not registered
//   - transaction: the transaction attempted
exports.NOT_REGISTERED = 'NOT_REGISTERED';
// Resources is exists
//   - transaction: the transaction attempted
exports.EXISTS = 'EXISTS';
// Invalid password
exports.INVALID_PASSWORD = 'INVALID_PASSWORD';
// Invalid password
exports.INVALID_ADDRESS = 'INVALID_ADDRESS';
// Connection Error
exports.CONNECTION_ERROR = 'CONNECTION_ERROR';
// Unknown Error
exports.UNKNOWN_ERROR = 'UNKNOWN_ERROR';
// Not implemented
exports.NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';
// Missing new operator to an object
//  - name: The name of the class
exports.MISSING_NEW = 'MISSING_NEW';
// Call exception
//  - transaction: the transaction
//  - address?: the contract address
//  - args?: The arguments passed into the function
//  - method?: The Solidity method signature
//  - errorSignature?: The EIP848 error signature
//  - errorArgs?: The EIP848 error parameters
//  - reason: The reason (only for EIP848 "Error(string)")
exports.CALL_EXCEPTION = 'CALL_EXCEPTION';
// Invalid argument (e.g. value is incompatible with type) to a function:
//   - argument: The argument name that was invalid
//   - value: The value of the argument
exports.INVALID_ARGUMENT = 'INVALID_ARGUMENT';
// Missing argument to a function:
//   - count: The number of arguments received
//   - expectedCount: The number of arguments expected
exports.MISSING_ARGUMENT = 'MISSING_ARGUMENT';
// Missing fees
exports.MISSING_FEES = 'MISSING_FEES';
// Too many arguments
//   - count: The number of arguments received
//   - expectedCount: The number of arguments expected
exports.UNEXPECTED_ARGUMENT = 'UNEXPECTED_ARGUMENT';
// Numeric Fault
//   - operation: the operation being executed
//   - fault: the reason this faulted
exports.NUMERIC_FAULT = 'NUMERIC_FAULT';
// Insufficien funds
//   - transaction: the transaction attempted
exports.INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS';
// Insufficien fees
//   - transaction: the transaction attempted
exports.INSUFFICIENT_FEES = 'INSUFFICIENT_FEES';
// Nonce has already been used
//   - transaction: the transaction attempted
exports.NONCE_EXPIRED = 'NONCE_EXPIRED';
// The replacement fee for the transaction is too low
//   - transaction: the transaction attempted
exports.REPLACEMENT_UNDERPRICED = 'REPLACEMENT_UNDERPRICED';
// Unsupported operation
//   - operation
exports.UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION';
// Invalid format
//   - value
//   - key
//   - object
exports.INVALID_FORMAT = 'INVALID_FORMAT';
// Signature verification failed
//   - transaction: the transaction attempted
exports.SIGNATURE_FAILED = 'SIGNATURE_FAILED';
let _permanentCensorErrors = false;
let _censorErrors = false;
function throwError(message, code, params) {
    throw createError(message, code, params);
}
// @TODO: Enum
function createError(message, code, params) {
    if (_censorErrors) {
        return new Error('unknown error');
    }
    if (!code) {
        code = exports.UNKNOWN_ERROR;
    }
    if (!params) {
        params = {};
    }
    let messageDetails = [];
    Object.keys(params).forEach((key) => {
        try {
            messageDetails.push(key + '=' + JSON.stringify(params[key]));
        }
        catch (error) {
            messageDetails.push(key + '=' + JSON.stringify(params[key].toString()));
        }
    });
    messageDetails.push("version=" + mxw_1.version);
    let reason = message;
    if (messageDetails.length) {
        message += ' (' + messageDetails.join(', ') + ')';
    }
    // @TODO: Any??
    let error = new Error(message);
    error.reason = reason;
    error.code = code;
    Object.keys(params).forEach(function (key) {
        error[key] = params[key];
    });
    return error;
}
function checkNew(self, kind) {
    if (!(self instanceof kind)) {
        throwError('missing new', exports.MISSING_NEW, { name: kind.name });
    }
}
function checkArgumentCount(count, expectedCount, suffix) {
    if (!suffix) {
        suffix = '';
    }
    if (count < expectedCount) {
        throwError('missing argument' + suffix, exports.MISSING_ARGUMENT, { count: count, expectedCount: expectedCount });
    }
    if (count > expectedCount) {
        throwError('too many arguments' + suffix, exports.UNEXPECTED_ARGUMENT, { count: count, expectedCount: expectedCount });
    }
}
function setCensorship(censorship, permanent) {
    if (_permanentCensorErrors) {
        throwError('error censorship permanent', exports.UNSUPPORTED_OPERATION, { operation: 'setCensorship' });
    }
    _censorErrors = !!censorship;
    _permanentCensorErrors = !!permanent;
}
function checkNormalize() {
    try {
        // Make sure all forms of normalization are supported
        ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
            try {
                "test".normalize(form);
            }
            catch (error) {
                throw new Error('missing ' + form);
            }
        });
        if (String.fromCharCode(0xe9).normalize('NFD') !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error('broken implementation');
        }
    }
    catch (error) {
        throwError('platform missing String.prototype.normalize', exports.UNSUPPORTED_OPERATION, { operation: 'String.prototype.normalize', form: error.message });
    }
}
const LogLevels = { debug: 1, normal: 2, info: 2, warn: 3, error: 4, off: 5 };
let LogLevel = LogLevels["normal"];
function setLogLevel(logLevel) {
    let level = LogLevels[logLevel];
    if (level == null) {
        warn("invliad log level - " + logLevel);
        return;
    }
    LogLevel = level;
}
function log(logLevel, args) {
    if (LogLevel > LogLevels[logLevel]) {
        return;
    }
    console.log.apply(console, args);
}
function error(...args) {
    log("error", args);
}
function warn(...args) {
    log("warn", args);
}
function info(...args) {
    log("info", args);
}
function normal(...args) {
    log("normal", args);
}
function debug(...args) {
    log("debug", args);
}
//# sourceMappingURL=errors.js.map