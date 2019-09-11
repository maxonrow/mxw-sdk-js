'use strict';

import { ec as EC } from 'elliptic';
import { createHash } from 'crypto';

import { AddressPrefix } from '../constants';
import { getAddress } from './address';

import { arrayify, hexlify, hexZeroPad, splitSignature } from './bytes';
import { hashMessage } from './hash';
import { defineReadOnly } from './properties';
import { encode as bech32Encode, decode as bech32Decode, fromWords as bech32FromWords, toWords as bech32ToWords } from './bech32';

import * as errors from '../errors';

///////////////////////////////
// Imported Types

import { Arrayish, Signature } from './bytes';

///////////////////////////////

let _curve: EC = null
function getCurve() {
    if (!_curve) {
        _curve = new EC('secp256k1');
    }
    return _curve;
}

function hash(algorithm: string, data: string | Buffer) {
    return createHash(algorithm).update(data).digest();
}

export class KeyPair {

    readonly privateKey: string;

    readonly publicKey: string;
    readonly publicKeyType: string;
    readonly compressedPublicKey: string;

    readonly publicKeyBytes: Uint8Array;

    constructor(privateKey: Arrayish | string) {
        let keyPair = getCurve().keyFromPrivate(arrayify(privateKey));

        defineReadOnly(this, 'privateKey', hexlify(keyPair.priv.toArray('be', 32)));
        defineReadOnly(this, 'publicKey', '0x' + keyPair.getPublic(false, 'hex'));
        defineReadOnly(this, 'publicKeyType', 'PubKeySecp256k1');
        defineReadOnly(this, 'compressedPublicKey', '0x' + keyPair.getPublic(true, 'hex'));
        defineReadOnly(this, 'publicKeyBytes', keyPair.getPublic().encode(null, true));
    }

    sign(digest: Arrayish | string): Signature {
        let keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        let signature = keyPair.sign(arrayify(digest), { canonical: true });
        return {
            recoveryParam: signature.recoveryParam,
            r: hexZeroPad('0x' + signature.r.toString(16), 32),
            s: hexZeroPad('0x' + signature.s.toString(16), 32),
            v: 27 + signature.recoveryParam
        }

    }

    computeSharedSecret(otherKey: Arrayish | string): string {
        let keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        let otherKeyPair = getCurve().keyFromPublic(arrayify(computePublicKey(otherKey)));
        return hexZeroPad('0x' + keyPair.derive(otherKeyPair.getPublic()).toString(16), 32);
    }

    _addPoint(other: Arrayish | string): string {
        let p0 = getCurve().keyFromPublic(arrayify(this.publicKey));
        let p1 = getCurve().keyFromPublic(arrayify(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
    }
}

export function computePublicKey(key: Arrayish | string, compressed?: boolean): string {

    let bytes = arrayify(key);

    if (bytes.length === 32) {
        let keyPair: KeyPair = new KeyPair(bytes);
        if (compressed) {
            return keyPair.compressedPublicKey;
        }
        return keyPair.publicKey;

    } else if (bytes.length === 33) {
        if (compressed) { return hexlify(bytes); }
        return '0x' + getCurve().keyFromPublic(bytes).getPublic(false, 'hex');

    } else if (bytes.length === 65) {
        if (!compressed) { return hexlify(bytes); }
        return '0x' + getCurve().keyFromPublic(bytes).getPublic(true, 'hex');
    }

    errors.throwError('invalid public or private key', errors.INVALID_ARGUMENT, { arg: 'key', value: '[REDACTED]' });
    return null;
}

export function computeAddress(key: Arrayish | string, prefix?: string): string {
    let bytes;

    if (typeof (key) == 'string') {
        if (key.match(/^(0x)?[0-9a-fA-F]{40}$/) || key.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
            // Missing the 0x prefix
            if (key.substring(0, 2) !== '0x') { key = '0x' + key; }

            bytes = arrayify(key); // Hex based address
        }
    }
    if (!bytes) {
        // Strip off the leading "0x"
        let publicKey = computePublicKey(key, true).substring(2);
        bytes = hash('ripemd160', hash('sha256', Buffer.from(publicKey, 'hex')));
    }
    return getAddress(bech32Encode(prefix ? prefix : AddressPrefix, bech32ToWords(bytes)));
}

export function computeHexAddress(address: string): string {
    return getAddress(hexlify(bech32FromWords(bech32Decode(address).words)));
}

export function recoverPublicKey(digest: Arrayish | string, signature: Signature | string, recoveryParam?: number): string {
    let sig = splitSignature(signature);
    let rs = { r: arrayify(sig.r), s: arrayify(sig.s) };
    
    if (recoveryParam) {
        sig.recoveryParam = recoveryParam;
    }
    return '0x' + getCurve().recoverPubKey(arrayify(digest), rs, sig.recoveryParam).encode('hex', false);
}

export function recoverAddress(digest: Arrayish | string, signature: Signature | string, recoveryParam?: number): string {
    return computeAddress(recoverPublicKey(arrayify(digest), signature, recoveryParam));
}

export function verifyMessage(message: Arrayish | string, signature: Signature | string, recoveryParam?: number): string {
    return recoverAddress(hashMessage(message), signature, recoveryParam);
}

export function verify(message: Arrayish | string, signature: Signature | string, address: string): boolean {
    let m = hashMessage(message);
    for (let recoveryParam = 0; 2 > recoveryParam; recoveryParam++) {
        let signer = recoverAddress(m, signature, recoveryParam);
        if (address === signer) {
            return true;
        }
    }

    return false;
}
