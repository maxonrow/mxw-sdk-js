'use strict';

import { BigNumber, bigNumberify } from '../utils/bignumber';
import { hexDataLength, isHexString } from '../utils/bytes';
import { isType } from './properties';
import * as errors from '../errors';

export function isUndefinedOrNull(v): boolean {
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

export function isUndefinedOrNullOrEmpty(v): boolean {
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

export function sortObject(obj) {
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

export function iterate(obj, modifier?: (key: string, value: any, type: string) => any) {
    if (obj && "object" == typeof obj) {
        let modified = (Array.isArray(obj)) ? [] : {};

        Object.keys(obj).forEach(function (key) {
            let data = obj[key];
            if (undefined != data) {
                let type: string;
                if (isType(data, "BigNumber")) {
                    type = "BigNumber";
                }
                else {
                    type = data.constructor ? data.constructor.name : null;
                }

                if ("object" == typeof data && 0 < Object.keys(data).length) {
                    if (modifier) {
                        data = modifier.apply(obj, [key, data, type])
                    }
                    modified[key] = iterate(data, modifier);
                }
                else {
                    if (modifier) {
                        data = modifier.apply(obj, [key, data, type])
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

export function convertObject(object: any, convert?: (key: string, value: any) => any, depth?: number): any {
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

export function checkFormat(format: any, object: any): any {
    let result: any = {};
    for (let key in format) {
        try {
            if ('function' !== typeof (format[key]))
                result[key] = checkFormat(format[key], object[key]);
            else {
                let value = format[key](object[key]);
                if (value !== undefined) { result[key] = value; }
            }
        } catch (error) {
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

export type CheckFormatFunc = (value: any) => any;

export function allowNull(check: CheckFormatFunc, nullValue?: any): CheckFormatFunc {
    return (function (value: any) {
        if (value == null) { return nullValue; }
        return check(value);
    });
}

export function notAllowNull(check: CheckFormatFunc): CheckFormatFunc {
    return (function (value: any) {
        if (value == null) { throw new Error('is null'); }
        return check(value);
    });
}

export function allowNullOrEmpty(check: CheckFormatFunc, nullValue?: any): CheckFormatFunc {
    return (function (value: any) {
        if (value == null || '' === value || (Array.isArray(value) && 0 === value.length)) { return nullValue; }
        return check(value);
    });
}

export function notAllowNullOrEmpty(check: CheckFormatFunc): CheckFormatFunc {
    return (function (value: any) {
        if (isUndefinedOrNullOrEmpty(value)) { throw new Error('empty'); }
        return check(value);
    });
}

export function expectTypeOf(check: CheckFormatFunc, type: string): CheckFormatFunc {
    return (function (value: any) {
        if (type !== typeof value) { throw new Error("expected type " + type + ", but " + (typeof value)); }
        return check(value);
    });
}

export function arrayOf(check: CheckFormatFunc): CheckFormatFunc {
    return (function (array: any): Array<any> {
        if (!Array.isArray(array)) { throw new Error('not an array'); }

        let result: any = [];

        array.forEach(function (value) {
            result.push(check(value));
        });

        return result;
    });
}

export function checkHash(hash: any, requirePrefix?: boolean): string {
    if (typeof (hash) === 'string') {
        if (!requirePrefix && hash.substring(0, 2) !== '0x') { hash = '0x' + hash; }
        if (hexDataLength(hash) === 32) {
            return hash.toLowerCase();
        }
    }
    throw new Error('invalid hash - ' + hash);
}

export function checkNumber(number: any): number {
    return bigNumberify(number).toNumber();
}

export function checkNumberString(number: any): string {
    return bigNumberify(number).toNumber().toString();
}

export function checkBigNumber(number: any): BigNumber {
    return bigNumberify(number);
}

export function checkBigNumberString(value: any): string {
    return bigNumberify(value).toString();
}

export function checkBoolean(value: any): boolean {
    if (typeof (value) === 'boolean') { return value; }
    if (typeof (value) === 'string') {
        if (value === 'true') { return true; }
        if (value === 'false') { return false; }
    }
    throw new Error('invalid boolean - ' + value);
}

export function checkString(string: any): string {
    if (typeof (string) !== 'string') {
        throw new Error('invalid string');
    }
    return string;
}

export function checkTimestamp(string: string) {
    if (typeof (string) !== 'string') { throw new Error('invalid timestanmp'); }
    return string;
}

export function checkAddress(string: string) {
    if (typeof (string) !== 'string') { throw new Error('invalid address'); }
    return string;
}

export function checkHex(string: string) {
    if (typeof (string) === 'string') {
        if (!string.startsWith("0x")) string = "0x" + string;
        if (isHexString(string))
            return string;
    }
    throw new Error('invalid hex - ' + string);
}

export function checkHexAddress(string: string) {
    if (typeof (string) === 'string') {
        if (!string.startsWith("0x")) string = "0x" + string;
        if (isHexString(string))
            return string;
    }
    throw new Error('invalid hex address - ' + string);
}

export function checkAny(value: any) {
    return value;
}
