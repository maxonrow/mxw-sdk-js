'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *  BigNumber
 *
 *  A wrapper around the BN.js object. We use the BN.js library
 *  because it is used by elliptic, so it is required regardles.
 *
 */
const bn_js_1 = __importDefault(require("bn.js"));
const bytes_1 = require("./bytes");
const properties_1 = require("./properties");
const errors = __importStar(require("../errors"));
const BN_1 = new bn_js_1.default.BN(-1);
function toHex(bn) {
    let value = bn.toString(16);
    if (value[0] === '-') {
        if ((value.length % 2) === 0) {
            return '-0x0' + value.substring(1);
        }
        return "-0x" + value.substring(1);
    }
    if ((value.length % 2) === 1) {
        return '0x0' + value;
    }
    return '0x' + value;
}
function toBN(value) {
    return _bnify(bigNumberify(value));
}
function toBigNumber(bn) {
    return new BigNumber(toHex(bn));
}
function _bnify(value) {
    let hex = value._hex;
    if (hex[0] === '-') {
        return (new bn_js_1.default.BN(hex.substring(3), 16)).mul(BN_1);
    }
    return new bn_js_1.default.BN(hex.substring(2), 16);
}
class BigNumber {
    constructor(value) {
        errors.checkNew(this, BigNumber);
        properties_1.setType(this, 'BigNumber');
        if (typeof (value) === 'string') {
            if (bytes_1.isHexString(value)) {
                if (value == '0x') {
                    value = '0x0';
                }
                properties_1.defineReadOnly(this, '_hex', value);
            }
            else if (value[0] === '-' && bytes_1.isHexString(value.substring(1))) {
                properties_1.defineReadOnly(this, '_hex', value);
            }
            else if (value.match(/^-?[0-9]*$/)) {
                if (value == '') {
                    value = '0';
                }
                properties_1.defineReadOnly(this, '_hex', toHex(new bn_js_1.default.BN(value)));
            }
            else {
                errors.throwError('invalid BigNumber string value', errors.INVALID_ARGUMENT, { arg: 'value', value: value });
            }
        }
        else if (typeof (value) === 'number') {
            if (parseInt(String(value)) !== value) {
                errors.throwError('underflow', errors.NUMERIC_FAULT, { operation: 'setValue', fault: 'underflow', value: value, outputValue: parseInt(String(value)) });
            }
            try {
                properties_1.defineReadOnly(this, '_hex', toHex(new bn_js_1.default.BN(value)));
            }
            catch (error) {
                errors.throwError('overflow', errors.NUMERIC_FAULT, { operation: 'setValue', fault: 'overflow', details: error.message });
            }
        }
        else if (value instanceof BigNumber) {
            properties_1.defineReadOnly(this, '_hex', value._hex);
        }
        else if (value.toHexString) {
            properties_1.defineReadOnly(this, '_hex', toHex(toBN(value.toHexString())));
        }
        else if (value._hex && bytes_1.isHexString(value._hex)) {
            properties_1.defineReadOnly(this, '_hex', value._hex);
        }
        else if (bytes_1.isArrayish(value)) {
            properties_1.defineReadOnly(this, '_hex', toHex(new bn_js_1.default.BN(bytes_1.hexlify(value).substring(2), 16)));
        }
        else {
            errors.throwError('invalid BigNumber value', errors.INVALID_ARGUMENT, { arg: 'value', value: value });
        }
    }
    fromTwos(value) {
        return toBigNumber(_bnify(this).fromTwos(value));
    }
    toTwos(value) {
        return toBigNumber(_bnify(this).toTwos(value));
    }
    abs() {
        if (this._hex[0] === '-') {
            return toBigNumber(_bnify(this).mul(BN_1));
        }
        return this;
    }
    add(other) {
        return toBigNumber(_bnify(this).add(toBN(other)));
    }
    sub(other) {
        return toBigNumber(_bnify(this).sub(toBN(other)));
    }
    div(other) {
        let o = bigNumberify(other);
        if (o.isZero()) {
            errors.throwError('division by zero', errors.NUMERIC_FAULT, { operation: 'divide', fault: 'division by zero' });
        }
        return toBigNumber(_bnify(this).div(toBN(other)));
    }
    mul(other) {
        return toBigNumber(_bnify(this).mul(toBN(other)));
    }
    mod(other) {
        return toBigNumber(_bnify(this).mod(toBN(other)));
    }
    pow(other) {
        return toBigNumber(_bnify(this).pow(toBN(other)));
    }
    maskn(value) {
        return toBigNumber(_bnify(this).maskn(value));
    }
    eq(other) {
        return _bnify(this).eq(toBN(other));
    }
    lt(other) {
        return _bnify(this).lt(toBN(other));
    }
    lte(other) {
        return _bnify(this).lte(toBN(other));
    }
    gt(other) {
        return _bnify(this).gt(toBN(other));
    }
    gte(other) {
        return _bnify(this).gte(toBN(other));
    }
    isZero() {
        return _bnify(this).isZero();
    }
    toNumber() {
        try {
            return _bnify(this).toNumber();
        }
        catch (error) {
            errors.throwError('overflow', errors.NUMERIC_FAULT, { operation: 'setValue', fault: 'overflow', details: error.message });
        }
        return null;
    }
    toString() {
        let str = _bnify(this).toString(10);
        return str;
    }
    toHexString() {
        return this._hex;
    }
    static isBigNumber(value) {
        return properties_1.isType(value, 'BigNumber');
    }
}
exports.BigNumber = BigNumber;
function bigNumberify(value) {
    if (BigNumber.isBigNumber(value)) {
        return value;
    }
    return new BigNumber(value);
}
exports.bigNumberify = bigNumberify;
//# sourceMappingURL=bignumber.js.map