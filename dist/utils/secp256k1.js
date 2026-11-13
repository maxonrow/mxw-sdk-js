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
exports.KeyPair = void 0;
exports.computePublicKey = computePublicKey;
exports.computeAddress = computeAddress;
exports.computeHexAddress = computeHexAddress;
exports.recoverPublicKey = recoverPublicKey;
exports.recoverAddress = recoverAddress;
exports.verifyMessage = verifyMessage;
exports.verify = verify;
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
    return (0, crypto_1.createHash)(algorithm).update(data).digest();
}
class KeyPair {
    constructor(privateKey) {
        let keyPair = getCurve().keyFromPrivate((0, bytes_1.arrayify)(privateKey));
        (0, properties_1.defineReadOnly)(this, 'privateKey', (0, bytes_1.hexlify)(keyPair.priv.toArray('be', 32)));
        (0, properties_1.defineReadOnly)(this, 'publicKey', '0x' + keyPair.getPublic(false, 'hex'));
        (0, properties_1.defineReadOnly)(this, 'publicKeyType', 'PubKeySecp256k1');
        (0, properties_1.defineReadOnly)(this, 'compressedPublicKey', '0x' + keyPair.getPublic(true, 'hex'));
        (0, properties_1.defineReadOnly)(this, 'publicKeyBytes', keyPair.getPublic().encode(null, true));
    }
    sign(digest) {
        let keyPair = getCurve().keyFromPrivate((0, bytes_1.arrayify)(this.privateKey));
        let signature = keyPair.sign((0, bytes_1.arrayify)(digest), { canonical: true });
        return {
            recoveryParam: signature.recoveryParam,
            r: (0, bytes_1.hexZeroPad)('0x' + signature.r.toString(16), 32),
            s: (0, bytes_1.hexZeroPad)('0x' + signature.s.toString(16), 32),
            v: 27 + signature.recoveryParam
        };
    }
    computeSharedSecret(otherKey) {
        let keyPair = getCurve().keyFromPrivate((0, bytes_1.arrayify)(this.privateKey));
        let otherKeyPair = getCurve().keyFromPublic((0, bytes_1.arrayify)(computePublicKey(otherKey)));
        return (0, bytes_1.hexZeroPad)('0x' + keyPair.derive(otherKeyPair.getPublic()).toString(16), 32);
    }
    _addPoint(other) {
        let p0 = getCurve().keyFromPublic((0, bytes_1.arrayify)(this.publicKey));
        let p1 = getCurve().keyFromPublic((0, bytes_1.arrayify)(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
    }
}
exports.KeyPair = KeyPair;
function computePublicKey(key, compressed) {
    let bytes = (0, bytes_1.arrayify)(key);
    if (bytes.length === 32) {
        let keyPair = new KeyPair(bytes);
        if (compressed) {
            return keyPair.compressedPublicKey;
        }
        return keyPair.publicKey;
    }
    else if (bytes.length === 33) {
        if (compressed) {
            return (0, bytes_1.hexlify)(bytes);
        }
        return '0x' + getCurve().keyFromPublic(bytes).getPublic(false, 'hex');
    }
    else if (bytes.length === 65) {
        if (!compressed) {
            return (0, bytes_1.hexlify)(bytes);
        }
        return '0x' + getCurve().keyFromPublic(bytes).getPublic(true, 'hex');
    }
    errors.throwError('invalid public or private key', errors.INVALID_ARGUMENT, { arg: 'key', value: '[REDACTED]' });
    return null;
}
function computeAddress(key, prefix) {
    let bytes;
    if (typeof (key) == 'string') {
        if (key.match(/^(0x)?[0-9a-fA-F]{40}$/) || key.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
            // Missing the 0x prefix
            if (key.substring(0, 2) !== '0x') {
                key = '0x' + key;
            }
            bytes = (0, bytes_1.arrayify)(key); // Hex based address
        }
    }
    if (!bytes) {
        // Strip off the leading "0x"
        let publicKey = computePublicKey(key, true).substring(2);
        bytes = hash('ripemd160', hash('sha256', Buffer.from(publicKey, 'hex')));
    }
    return (0, address_1.getAddress)((0, bech32_1.encode)(prefix ? prefix : constants_1.AddressPrefix, (0, bech32_1.toWords)(bytes)));
}
function computeHexAddress(address) {
    return (0, address_1.getAddress)((0, bytes_1.hexlify)((0, bech32_1.fromWords)((0, bech32_1.decode)(address).words)));
}
function recoverPublicKey(digest, signature, recoveryParam) {
    let sig = (0, bytes_1.splitSignature)(signature);
    let rs = { r: (0, bytes_1.arrayify)(sig.r), s: (0, bytes_1.arrayify)(sig.s) };
    if (recoveryParam) {
        sig.recoveryParam = recoveryParam;
    }
    return '0x' + getCurve().recoverPubKey((0, bytes_1.arrayify)(digest), rs, sig.recoveryParam).encode('hex', false);
}
function recoverAddress(digest, signature, recoveryParam) {
    return computeAddress(recoverPublicKey((0, bytes_1.arrayify)(digest), signature, recoveryParam));
}
function verifyMessage(message, signature, recoveryParam) {
    return recoverAddress((0, hash_1.hashMessage)(message), signature, recoveryParam);
}
function verify(message, signature, address) {
    let m = (0, hash_1.hashMessage)(message);
    for (let recoveryParam = 0; 2 > recoveryParam; recoveryParam++) {
        let signer = recoverAddress(m, signature, recoveryParam);
        if (address === signer) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=secp256k1.js.map