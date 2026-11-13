'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUndefinedOrNull = isUndefinedOrNull;
exports.isUndefinedOrNullOrEmpty = isUndefinedOrNullOrEmpty;
exports.sortObject = sortObject;
exports.iterate = iterate;
exports.convertObject = convertObject;
exports.checkFormat = checkFormat;
exports.allowNull = allowNull;
exports.notAllowNull = notAllowNull;
exports.allowNullOrEmpty = allowNullOrEmpty;
exports.notAllowNullOrEmpty = notAllowNullOrEmpty;
exports.expectTypeOf = expectTypeOf;
exports.arrayOf = arrayOf;
exports.checkHash = checkHash;
exports.checkNumber = checkNumber;
exports.checkNumberString = checkNumberString;
exports.checkBigNumber = checkBigNumber;
exports.checkBigNumberString = checkBigNumberString;
exports.checkBoolean = checkBoolean;
exports.checkString = checkString;
exports.checkTimestamp = checkTimestamp;
exports.checkAddress = checkAddress;
exports.checkHex = checkHex;
exports.checkHexAddress = checkHexAddress;
exports.checkAny = checkAny;
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
function iterate(obj, modifier) {
    if (obj && "object" == typeof obj) {
        let modified = (Array.isArray(obj)) ? [] : {};
        Object.keys(obj).forEach(function (key) {
            let data = obj[key];
            if (undefined != data) {
                let type;
                if ((0, properties_1.isType)(data, "BigNumber")) {
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
function allowNull(check, nullValue) {
    return (function (value) {
        if (value == null) {
            return nullValue;
        }
        return check(value);
    });
}
function notAllowNull(check) {
    return (function (value) {
        if (value == null) {
            throw new Error('is null');
        }
        return check(value);
    });
}
function allowNullOrEmpty(check, nullValue) {
    return (function (value) {
        if (value == null || '' === value || (Array.isArray(value) && 0 === value.length)) {
            return nullValue;
        }
        return check(value);
    });
}
function notAllowNullOrEmpty(check) {
    return (function (value) {
        if (isUndefinedOrNullOrEmpty(value)) {
            throw new Error('empty');
        }
        return check(value);
    });
}
function expectTypeOf(check, type) {
    return (function (value) {
        if (type !== typeof value) {
            throw new Error("expected type " + type + ", but " + (typeof value));
        }
        return check(value);
    });
}
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
function checkHash(hash, requirePrefix) {
    if (typeof (hash) === 'string') {
        if (!requirePrefix && hash.substring(0, 2) !== '0x') {
            hash = '0x' + hash;
        }
        if ((0, bytes_1.hexDataLength)(hash) === 32) {
            return hash.toLowerCase();
        }
    }
    throw new Error('invalid hash - ' + hash);
}
function checkNumber(number) {
    return (0, bignumber_1.bigNumberify)(number).toNumber();
}
function checkNumberString(number) {
    return (0, bignumber_1.bigNumberify)(number).toNumber().toString();
}
function checkBigNumber(number) {
    return (0, bignumber_1.bigNumberify)(number);
}
function checkBigNumberString(value) {
    return (0, bignumber_1.bigNumberify)(value).toString();
}
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
function checkString(string) {
    if (typeof (string) !== 'string') {
        throw new Error('invalid string');
    }
    return string;
}
function checkTimestamp(string) {
    if (typeof (string) !== 'string') {
        throw new Error('invalid timestanmp');
    }
    return string;
}
function checkAddress(string) {
    if (typeof (string) !== 'string') {
        throw new Error('invalid address');
    }
    return string;
}
function checkHex(string) {
    if (typeof (string) === 'string') {
        if (!string.startsWith("0x"))
            string = "0x" + string;
        if ((0, bytes_1.isHexString)(string))
            return string;
    }
    throw new Error('invalid hex - ' + string);
}
function checkHexAddress(string) {
    if (typeof (string) === 'string') {
        if (!string.startsWith("0x"))
            string = "0x" + string;
        if ((0, bytes_1.isHexString)(string))
            return string;
    }
    throw new Error('invalid hex address - ' + string);
}
function checkAny(value) {
    return value;
}
//# sourceMappingURL=misc.js.map