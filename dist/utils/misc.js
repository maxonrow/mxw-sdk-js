'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_1 = require("../utils/bignumber");
const bytes_1 = require("../utils/bytes");
const properties_1 = require("./properties");
const errors = __importStar(require("../errors"));
function isUndefinedOrNull(v) {
    if (v) {
        return false;
    }
    else {
        if ("number" === typeof (v) || "string" === typeof (v) || "boolean" === typeof (v)) {
            return false;
        }
    }
    return true;
}
exports.isUndefinedOrNull = isUndefinedOrNull;
function isUndefinedOrNullOrEmpty(v) {
    if (v) {
        if ("string" === typeof (v)) {
            if (0 < v.length) {
                return false;
            }
        }
        return false;
    }
    else {
        if ("number" === typeof (v) || "boolean" === typeof (v)) {
            return false;
        }
    }
    return true;
}
exports.isUndefinedOrNullOrEmpty = isUndefinedOrNullOrEmpty;
function sortObject(obj) {
    if ("object" == typeof obj) {
        let sorted = (Array.isArray(obj)) ? [] : {};
        Object.keys(obj).sort().forEach(function (key) {
            if (null == obj[key]) {
                sorted[key] = obj[key];
            }
            else if ("object" == typeof obj[key] && 0 < Object.keys(obj[key]).length) {
                sorted[key] = sortObject(obj[key]);
            }
            else {
                if (Array.isArray(sorted)) {
                    sorted.push(obj[key]);
                }
                else {
                    sorted[key] = obj[key];
                }
            }
        });
        return sorted;
    }
    return obj;
}
exports.sortObject = sortObject;
function iterate(obj, modifier) {
    if (obj && "object" == typeof obj) {
        let modified = (Array.isArray(obj)) ? [] : {};
        Object.keys(obj).forEach(function (key) {
            let data = obj[key];
            if (undefined != data) {
                let type;
                if (properties_1.isType(data, "BigNumber")) {
                    type = "BigNumber";
                }
                else {
                    type = data.constructor ? data.constructor.name : null;
                }
                if ("object" == typeof data && 0 < Object.keys(data).length) {
                    if (modifier) {
                        data = modifier.apply(obj, [key, data, type]);
                    }
                    modified[key] = iterate(data, modifier);
                }
                else {
                    if (modifier) {
                        data = modifier.apply(obj, [key, data, type]);
                    }
                    if (Array.isArray(modified)) {
                        modified.push(data);
                    }
                    else {
                        modified[key] = data;
                    }
                }
            }
            else if (null === data)
                modified[key] = data;
            else { }
        });
        return modified;
    }
    return obj;
}
exports.iterate = iterate;
function convertObject(object, convert, depth) {
    if ("object" == typeof object) {
        let stringified = (Array.isArray(object)) ? [] : {};
        Object.keys(object).forEach(function (key) {
            if ("object" == typeof object[key] && 0 < Object.keys(object[key]).length) {
                stringified[key] = sortObject(object[key]);
            }
            else {
                let value = ("function" === typeof object.toString) ? object.toString() : JSON.stringify(object);
                if (Array.isArray(stringified)) {
                    stringified.push(value);
                }
                else {
                    stringified[key] = value;
                }
            }
        });
        return stringified;
    }
    return object;
}
exports.convertObject = convertObject;
function checkFormat(format, object) {
    let result = {};
    for (let key in format) {
        try {
            if ('function' !== typeof (format[key]))
                result[key] = checkFormat(format[key], object[key]);
            else {
                let value = format[key](object[key]);
                if (value !== undefined) {
                    result[key] = value;
                }
            }
        }
        catch (error) {
            if (undefined === object[key]) {
                errors.throwError('missing object key ' + key, errors.MISSING_ARGUMENT, {
                    key,
                    object
                });
            }
            errors.throwError('invalid format object key ' + key + ": " + (error.reason ? error.reason : error.message), errors.INVALID_FORMAT, {
                value: object[key],
                key,
                object
            });
        }
    }
    return result;
}
exports.checkFormat = checkFormat;
function allowNull(check, nullValue) {
    return (function (value) {
        if (value == null) {
            return nullValue;
        }
        return check(value);
    });
}
exports.allowNull = allowNull;
function notAllowNull(check) {
    return (function (value) {
        if (value == null) {
            throw new Error('is null');
        }
        return check(value);
    });
}
exports.notAllowNull = notAllowNull;
function allowNullOrEmpty(check, nullValue) {
    return (function (value) {
        if (value == null || '' === value) {
            return nullValue;
        }
        return check(value);
    });
}
exports.allowNullOrEmpty = allowNullOrEmpty;
function notAllowNullOrEmpty(check) {
    return (function (value) {
        if (isUndefinedOrNullOrEmpty(value)) {
            throw new Error('empty');
        }
        return check(value);
    });
}
exports.notAllowNullOrEmpty = notAllowNullOrEmpty;
function expectTypeOf(check, type) {
    return (function (value) {
        if (type !== typeof value) {
            throw new Error("expected type " + type + ", but " + (typeof value));
        }
        return check(value);
    });
}
exports.expectTypeOf = expectTypeOf;
function arrayOf(check) {
    return (function (array) {
        if (!Array.isArray(array)) {
            throw new Error('not an array');
        }
        let result = [];
        array.forEach(function (value) {
            result.push(check(value));
        });
        return result;
    });
}
exports.arrayOf = arrayOf;
function checkHash(hash, requirePrefix) {
    if (typeof (hash) === 'string') {
        if (!requirePrefix && hash.substring(0, 2) !== '0x') {
            hash = '0x' + hash;
        }
        if (bytes_1.hexDataLength(hash) === 32) {
            return hash.toLowerCase();
        }
    }
    throw new Error('invalid hash - ' + hash);
}
exports.checkHash = checkHash;
function checkNumber(number) {
    return bignumber_1.bigNumberify(number).toNumber();
}
exports.checkNumber = checkNumber;
function checkNumberString(number) {
    return bignumber_1.bigNumberify(number).toNumber().toString();
}
exports.checkNumberString = checkNumberString;
function checkBigNumber(number) {
    return bignumber_1.bigNumberify(number);
}
exports.checkBigNumber = checkBigNumber;
function checkBigNumberString(value) {
    return bignumber_1.bigNumberify(value).toString();
}
exports.checkBigNumberString = checkBigNumberString;
function checkBoolean(value) {
    if (typeof (value) === 'boolean') {
        return value;
    }
    if (typeof (value) === 'string') {
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
    }
    throw new Error('invalid boolean - ' + value);
}
exports.checkBoolean = checkBoolean;
function checkString(string) {
    if (typeof (string) !== 'string') {
        throw new Error('invalid string');
    }
    return string;
}
exports.checkString = checkString;
function checkTimestamp(string) {
    if (typeof (string) !== 'string') {
        throw new Error('invalid timestanmp');
    }
    return string;
}
exports.checkTimestamp = checkTimestamp;
function checkAddress(string) {
    if (typeof (string) !== 'string') {
        throw new Error('invalid address');
    }
    return string;
}
exports.checkAddress = checkAddress;
function checkHex(string) {
    if (typeof (string) === 'string') {
        if (!string.startsWith("0x"))
            string = "0x" + string;
        if (bytes_1.isHexString(string))
            return string;
    }
    throw new Error('invalid hex - ' + string);
}
exports.checkHex = checkHex;
function checkHexAddress(string) {
    if (typeof (string) === 'string') {
        if (!string.startsWith("0x"))
            string = "0x" + string;
        if (bytes_1.isHexString(string))
            return string;
    }
    throw new Error('invalid hex address - ' + string);
}
exports.checkHexAddress = checkHexAddress;
function checkAny(value) {
    return value;
}
exports.checkAny = checkAny;
//# sourceMappingURL=misc.js.map