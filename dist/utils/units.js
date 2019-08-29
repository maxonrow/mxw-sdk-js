'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const errors = __importStar(require("../errors"));
const bignumber_1 = require("./bignumber");
const power18UnitName = "cin";
exports.power18UnitName = power18UnitName;
const power16UnitName = "kcin";
exports.power16UnitName = power16UnitName;
const power13UnitName = "Mcin";
exports.power13UnitName = power13UnitName;
const power10UnitName = "Gcin";
exports.power10UnitName = power10UnitName;
const power7UnitName = "Tcin";
exports.power7UnitName = power7UnitName;
const power4UnitName = "Jcin";
exports.power4UnitName = power4UnitName;
const power1UnitName = "mxw";
exports.power1UnitName = power1UnitName;
const unitDecimals = 18;
exports.unitDecimals = unitDecimals;
const unitName = power1UnitName;
exports.unitName = unitName;
const smallestUnitName = power18UnitName;
exports.smallestUnitName = smallestUnitName;
const names = [
    power18UnitName,
    power16UnitName,
    power13UnitName,
    power10UnitName,
    power7UnitName,
    power4UnitName,
    power1UnitName,
];
const unitInfos = {};
function _getUnitInfo(value) {
    return {
        decimals: value.length - 1,
        tenPower: bignumber_1.bigNumberify(value)
    };
}
// Build cache of common units
(function () {
    // Cache the common units
    let value = '1';
    names.forEach(function (name) {
        let info = _getUnitInfo(value);
        unitInfos[name.toLowerCase()] = info;
        unitInfos[String(info.decimals)] = info;
        value += '000';
    });
})();
function getUnitInfo(name) {
    // Try the cache
    let info = unitInfos[String(name).toLowerCase()];
    if (!info && typeof (name) === 'number' && parseInt(String(name)) == name && name >= 0 && name <= 256) {
        let value = '1';
        for (let i = 0; i < name; i++) {
            value += '0';
        }
        info = _getUnitInfo(value);
    }
    // Make sure we got something
    if (!info) {
        errors.throwError('invalid unitType', errors.INVALID_ARGUMENT, { argument: 'name', value: name });
    }
    return info;
}
// Some environments have issues with RegEx that contain back-tracking, so we cannot
// use them.
function commify(value) {
    let comps = String(value).split('.');
    if (comps.length > 2 || !comps[0].match(/^-?[0-9]*$/) || (comps[1] && !comps[1].match(/^[0-9]*$/)) || value === '.' || value === '-.') {
        errors.throwError('invalid value', errors.INVALID_ARGUMENT, { argument: 'value', value: value });
    }
    // Make sure we have at least one whole digit (0 if none)
    let whole = comps[0];
    let negative = '';
    if (whole.substring(0, 1) === '-') {
        negative = '-';
        whole = whole.substring(1);
    }
    // Make sure we have at least 1 whole digit with no leading zeros
    while (whole.substring(0, 1) === '0') {
        whole = whole.substring(1);
    }
    if (whole === '') {
        whole = '0';
    }
    let suffix = '';
    if (comps.length === 2) {
        suffix = '.' + (comps[1] || '0');
    }
    let formatted = [];
    while (whole.length) {
        if (whole.length <= 3) {
            formatted.unshift(whole);
            break;
        }
        else {
            let index = whole.length - 3;
            formatted.unshift(whole.substring(index));
            whole = whole.substring(0, index);
        }
    }
    return negative + formatted.join(',') + suffix;
}
exports.commify = commify;
function formatUnits(value, unitType) {
    let unitInfo = getUnitInfo(unitType);
    // Make sure wei is a big number (convert as necessary)
    value = bignumber_1.bigNumberify(value);
    let negative = value.lt(constants_1.Zero);
    if (negative) {
        value = value.mul(constants_1.NegativeOne);
    }
    let fraction = value.mod(unitInfo.tenPower).toString();
    while (fraction.length < unitInfo.decimals) {
        fraction = '0' + fraction;
    }
    // Strip training 0
    fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
    let whole = value.div(unitInfo.tenPower).toString();
    value = whole + '.' + fraction;
    if (negative) {
        value = '-' + value;
    }
    return value;
}
exports.formatUnits = formatUnits;
function parseUnits(value, unitType) {
    if (unitType == null) {
        unitType = 18;
    }
    let unitInfo = getUnitInfo(unitType);
    if (typeof (value) !== 'string' || !value.match(/^-?[0-9.,]+$/)) {
        errors.throwError('invalid decimal value', errors.INVALID_ARGUMENT, { arg: 'value', value: value });
    }
    if (unitInfo.decimals === 0) {
        return bignumber_1.bigNumberify(value);
    }
    // Is it negative?
    let negative = (value.substring(0, 1) === '-');
    if (negative) {
        value = value.substring(1);
    }
    if (value === '.') {
        errors.throwError('missing value', errors.INVALID_ARGUMENT, { arg: 'value', value: value });
    }
    // Split it into a whole and fractional part
    let comps = value.split('.');
    if (comps.length > 2) {
        errors.throwError('too many decimal points', errors.INVALID_ARGUMENT, { arg: 'value', value: value });
    }
    let whole = comps[0], fraction = comps[1];
    if (!whole) {
        whole = '0';
    }
    if (!fraction) {
        fraction = '0';
    }
    // Prevent underflow
    if (fraction.length > unitInfo.decimals) {
        errors.throwError('underflow occurred', errors.NUMERIC_FAULT, { operation: 'division', fault: "underflow" });
    }
    // Fully pad the string with zeros to get to wei
    while (fraction.length < unitInfo.decimals) {
        fraction += '0';
    }
    let wholeValue = bignumber_1.bigNumberify(whole);
    let fractionValue = bignumber_1.bigNumberify(fraction);
    let wei = (wholeValue.mul(unitInfo.tenPower)).add(fractionValue);
    if (negative) {
        wei = wei.mul(constants_1.NegativeOne);
    }
    return wei;
}
exports.parseUnits = parseUnits;
function formatMxw(cin) {
    return formatUnits(cin, unitDecimals);
}
exports.formatMxw = formatMxw;
function parseMxw(mxw) {
    return parseUnits(mxw, unitDecimals);
}
exports.parseMxw = parseMxw;
//# sourceMappingURL=units.js.map