'use strict';

import { arrayify, hexlify, stripZeros, concat } from './bytes';
import { AddressPrefix, ValOperatorAddressPrefix, KycAddressPrefix } from '../constants';
import { keccak256 } from './keccak256';
import errors = require('../errors');
import { BigNumber, Arrayish } from '.';
import { sha256 } from './sha2';
import { isUndefinedOrNullOrEmpty } from './misc';

function getChecksum(address: string): string {
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
        hashed = arrayify(keccak256(hashed));

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
        hashed = arrayify(keccak256(hashed));

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

export function getAddress(address: string): string {
    let result = null;

    if (typeof (address) === 'string') {
        if (address.startsWith(AddressPrefix)) {
            // TODO: We need more checking on this!
            result = address;
        }
        else if (address.startsWith(KycAddressPrefix)) {
            // TODO: We need more checking on this!
            result = address;
        }
        else if (address.startsWith(ValOperatorAddressPrefix)) {
            // TODO: We need more checking on this!
            result = address;
        }
        else if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
            // Missing the 0x prefix
            if (address.substring(0, 2) !== '0x') { address = '0x' + address; }

            result = getChecksum(address);

            // It is a checksummed address with a bad checksum
            if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
                errors.throwError('bad address checksum', errors.INVALID_ADDRESS, { value: address });
            }
        }
    }

    if (isUndefinedOrNullOrEmpty(result)) {
        errors.throwError('invalid address', errors.INVALID_ADDRESS, { value: address });
    }

    return result;
}

export function getHash(hash: Arrayish) {
    if (!hash) { throw new Error('missing hash'); }
    return getChecksum(hexlify(hash));
}

export function deriveAddress(from: string, nonce: Arrayish | BigNumber | number) {
    if (!from) { throw new Error('missing from address'); }
    if (!nonce) { throw new Error('missing nonce'); }

    let value = sha256(concat([
        getAddress(from), stripZeros(hexlify(nonce))
    ]));

    return getChecksum(value);
}
