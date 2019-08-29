'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *  SigningKey
 *
 *
 */
const hdnode_1 = require("./hdnode");
const bytes_1 = require("./bytes");
const properties_1 = require("./properties");
const secp256k1_1 = require("./secp256k1");
const errors = __importStar(require("../errors"));
///////////////////////////////
class SigningKey {
    constructor(privateKey) {
        errors.checkNew(this, SigningKey);
        let privateKeyBytes = null;
        if (hdnode_1.HDNode.isHDNode(privateKey)) {
            properties_1.defineReadOnly(this, 'mnemonic', privateKey.mnemonic);
            properties_1.defineReadOnly(this, 'wordlist', privateKey.wordlist);
            properties_1.defineReadOnly(this, 'path', privateKey.path);
            privateKeyBytes = bytes_1.arrayify(privateKey.privateKey);
        }
        else {
            // A lot of common tools do not prefix private keys with a 0x
            if (typeof (privateKey) === 'string' && privateKey.match(/^[0-9a-f]*$/i) && privateKey.length === 64) {
                privateKey = '0x' + privateKey;
            }
            privateKeyBytes = bytes_1.arrayify(privateKey);
        }
        try {
            if (privateKeyBytes.length !== 32) {
                errors.throwError('exactly 32 bytes required', errors.INVALID_ARGUMENT, { arg: 'privateKey', value: '[REDACTED]' });
            }
        }
        catch (error) {
            var params = { arg: 'privateKey', reason: error.reason, value: '[REDACTED]' };
            if (error.value) {
                if (typeof (error.value.length) === 'number') {
                    params.length = error.value.length;
                }
                params.type = typeof (error.value);
            }
            errors.throwError('invalid private key', error.code, params);
        }
        properties_1.defineReadOnly(this, 'privateKey', bytes_1.hexlify(privateKeyBytes));
        properties_1.defineReadOnly(this, 'keyPair', new secp256k1_1.KeyPair(privateKeyBytes));
        properties_1.defineReadOnly(this, 'publicKey', this.keyPair.publicKey);
        properties_1.defineReadOnly(this, 'publicKeyType', this.keyPair.publicKeyType);
        properties_1.defineReadOnly(this, 'compressedPublicKey', this.keyPair.compressedPublicKey);
        properties_1.defineReadOnly(this, 'address', secp256k1_1.computeAddress(this.keyPair.publicKey));
        properties_1.defineReadOnly(this, 'hexAddress', secp256k1_1.computeHexAddress(this.address));
        properties_1.setType(this, 'SigningKey');
    }
    signDigest(digest) {
        return this.keyPair.sign(digest);
    }
    computeSharedSecret(key) {
        return this.keyPair.computeSharedSecret(bytes_1.arrayify(key));
    }
    static isSigningKey(value) {
        return properties_1.isType(value, 'SigningKey');
    }
}
exports.SigningKey = SigningKey;
//# sourceMappingURL=signing-key.js.map