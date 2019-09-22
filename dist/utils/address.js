'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const bytes_1 = require("./bytes");
const constants_1 = require("../constants");
const keccak256_1 = require("./keccak256");
const errors = require("../errors");
const sha2_1 = require("./sha2");
const misc_1 = require("./misc");
function getChecksum(address) {
    if (typeof (address) !== 'string') {
        errors.throwError('invalid address', errors.INVALID_ARGUMENT, { arg: 'address', value: address });
    }
    address = address.toLowerCase();
    let chars = address.substring(2).split('');
    if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
        let hashed = new Uint8Array(40);
        for (let i = 0; i < 40; i++) {
            hashed[i] = chars[i].charCodeAt(0);
        }
        hashed = bytes_1.arrayify(keccak256_1.keccak256(hashed));
        for (let i = 0; i < 40; i += 2) {
            if ((hashed[i >> 1] >> 4) >= 8) {
                chars[i] = chars[i].toUpperCase();
            }
            if ((hashed[i >> 1] & 0x0f) >= 8) {
                chars[i + 1] = chars[i + 1].toUpperCase();
            }
        }
    }
    else if (address.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
        let hashed = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
            hashed[i] = chars[i].charCodeAt(0);
        }
        hashed = bytes_1.arrayify(keccak256_1.keccak256(hashed));
        for (let i = 0; i < 64; i += 2) {
            if ((hashed[i >> 1] >> 4) >= 8) {
                chars[i] = chars[i].toUpperCase();
            }
            if ((hashed[i >> 1] & 0x0f) >= 8) {
                chars[i + 1] = chars[i + 1].toUpperCase();
            }
        }
    }
    else {
        errors.throwError('invalid address', errors.INVALID_ADDRESS, { value: address });
    }
    return '0x' + chars.join('');
}
function getAddress(address) {
    let result = null;
    if (typeof (address) === 'string') {
        if (address.startsWith(constants_1.AddressPrefix)) {
            // TODO: We need more checking on this!
            result = address;
        }
        else if (address.startsWith(constants_1.KycAddressPrefix)) {
            // TODO: We need more checking on this!
            result = address;
        }
        else if (address.startsWith(constants_1.ValOperatorAddressPrefix)) {
            // TODO: We need more checking on this!
            result = address;
        }
        else if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
            // Missing the 0x prefix
            if (address.substring(0, 2) !== '0x') {
                address = '0x' + address;
            }
            result = getChecksum(address);
            // It is a checksummed address with a bad checksum
            if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
                errors.throwError('bad address checksum', errors.INVALID_ADDRESS, { value: address });
            }
        }
    }
    if (misc_1.isUndefinedOrNullOrEmpty(result)) {
        errors.throwError('invalid address', errors.INVALID_ADDRESS, { value: address });
    }
    return result;
}
exports.getAddress = getAddress;
function getHash(hash) {
    if (!hash) {
        throw new Error('missing hash');
    }
    return getChecksum(bytes_1.hexlify(hash));
}
exports.getHash = getHash;
function deriveAddress(from, nonce) {
    if (!from) {
        throw new Error('missing from address');
    }
    if (!nonce) {
        throw new Error('missing nonce');
    }
    let value = sha2_1.sha256(bytes_1.concat([
        getAddress(from), bytes_1.stripZeros(bytes_1.hexlify(nonce))
    ]));
    return getChecksum(value);
}
exports.deriveAddress = deriveAddress;
//# sourceMappingURL=address.js.map