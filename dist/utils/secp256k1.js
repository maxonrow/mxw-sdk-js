'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const elliptic_1 = require("elliptic");
const crypto_1 = require("crypto");
const constants_1 = require("../constants");
const address_1 = require("./address");
const bytes_1 = require("./bytes");
const hash_1 = require("./hash");
const properties_1 = require("./properties");
const bech32_1 = require("./bech32");
const errors = __importStar(require("../errors"));
///////////////////////////////
let _curve = null;
function getCurve() {
    if (!_curve) {
        _curve = new elliptic_1.ec('secp256k1');
    }
    return _curve;
}
function hash(algorithm, data) {
    return crypto_1.createHash(algorithm).update(data).digest();
}
class KeyPair {
    constructor(privateKey) {
        let keyPair = getCurve().keyFromPrivate(bytes_1.arrayify(privateKey));
        properties_1.defineReadOnly(this, 'privateKey', bytes_1.hexlify(keyPair.priv.toArray('be', 32)));
        properties_1.defineReadOnly(this, 'publicKey', '0x' + keyPair.getPublic(false, 'hex'));
        properties_1.defineReadOnly(this, 'publicKeyType', 'PubKeySecp256k1');
        properties_1.defineReadOnly(this, 'compressedPublicKey', '0x' + keyPair.getPublic(true, 'hex'));
        properties_1.defineReadOnly(this, 'publicKeyBytes', keyPair.getPublic().encode(null, true));
    }
    sign(digest) {
        let keyPair = getCurve().keyFromPrivate(bytes_1.arrayify(this.privateKey));
        let signature = keyPair.sign(bytes_1.arrayify(digest), { canonical: true });
        return {
            recoveryParam: signature.recoveryParam,
            r: bytes_1.hexZeroPad('0x' + signature.r.toString(16), 32),
            s: bytes_1.hexZeroPad('0x' + signature.s.toString(16), 32),
            v: 27 + signature.recoveryParam
        };
    }
    computeSharedSecret(otherKey) {
        let keyPair = getCurve().keyFromPrivate(bytes_1.arrayify(this.privateKey));
        let otherKeyPair = getCurve().keyFromPublic(bytes_1.arrayify(computePublicKey(otherKey)));
        return bytes_1.hexZeroPad('0x' + keyPair.derive(otherKeyPair.getPublic()).toString(16), 32);
    }
    _addPoint(other) {
        let p0 = getCurve().keyFromPublic(bytes_1.arrayify(this.publicKey));
        let p1 = getCurve().keyFromPublic(bytes_1.arrayify(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
    }
}
exports.KeyPair = KeyPair;
function computePublicKey(key, compressed) {
    let bytes = bytes_1.arrayify(key);
    if (bytes.length === 32) {
        let keyPair = new KeyPair(bytes);
        if (compressed) {
            return keyPair.compressedPublicKey;
        }
        return keyPair.publicKey;
    }
    else if (bytes.length === 33) {
        if (compressed) {
            return bytes_1.hexlify(bytes);
        }
        return '0x' + getCurve().keyFromPublic(bytes).getPublic(false, 'hex');
    }
    else if (bytes.length === 65) {
        if (!compressed) {
            return bytes_1.hexlify(bytes);
        }
        return '0x' + getCurve().keyFromPublic(bytes).getPublic(true, 'hex');
    }
    errors.throwError('invalid public or private key', errors.INVALID_ARGUMENT, { arg: 'key', value: '[REDACTED]' });
    return null;
}
exports.computePublicKey = computePublicKey;
function computeAddress(key) {
    // Strip off the leading "0x"
    let publicKey = computePublicKey(key, true).substring(2);
    let bytes = hash('ripemd160', hash('sha256', Buffer.from(publicKey, 'hex')));
    return address_1.getAddress(bech32_1.encode(constants_1.AddressPrefix, bech32_1.toWords(bytes)));
}
exports.computeAddress = computeAddress;
function computeHexAddress(address) {
    return address_1.getAddress(bytes_1.hexlify(bech32_1.fromWords(bech32_1.decode(address).words)));
}
exports.computeHexAddress = computeHexAddress;
function recoverPublicKey(digest, signature, recoveryParam) {
    let sig = bytes_1.splitSignature(signature);
    let rs = { r: bytes_1.arrayify(sig.r), s: bytes_1.arrayify(sig.s) };
    if (recoveryParam) {
        sig.recoveryParam = recoveryParam;
    }
    return '0x' + getCurve().recoverPubKey(bytes_1.arrayify(digest), rs, sig.recoveryParam).encode('hex', false);
}
exports.recoverPublicKey = recoverPublicKey;
function recoverAddress(digest, signature, recoveryParam) {
    return computeAddress(recoverPublicKey(bytes_1.arrayify(digest), signature, recoveryParam));
}
exports.recoverAddress = recoverAddress;
function verifyMessage(message, signature, recoveryParam) {
    return recoverAddress(hash_1.hashMessage(message), signature, recoveryParam);
}
exports.verifyMessage = verifyMessage;
function verify(message, signature, address) {
    let m = hash_1.hashMessage(message);
    for (let recoveryParam = 0; 2 > recoveryParam; recoveryParam++) {
        let signer = recoverAddress(m, signature, recoveryParam);
        if (address === signer) {
            return true;
        }
    }
    return false;
}
exports.verify = verify;
//# sourceMappingURL=secp256k1.js.map