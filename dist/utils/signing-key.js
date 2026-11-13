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
exports.SigningKey = void 0;
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
            (0, properties_1.defineReadOnly)(this, 'mnemonic', privateKey.mnemonic);
            (0, properties_1.defineReadOnly)(this, 'wordlist', privateKey.wordlist);
            (0, properties_1.defineReadOnly)(this, 'path', privateKey.path);
            privateKeyBytes = (0, bytes_1.arrayify)(privateKey.privateKey);
        }
        else {
            // A lot of common tools do not prefix private keys with a 0x
            if (typeof (privateKey) === 'string' && privateKey.match(/^[0-9a-f]*$/i) && privateKey.length === 64) {
                privateKey = '0x' + privateKey;
            }
            privateKeyBytes = (0, bytes_1.arrayify)(privateKey);
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
        (0, properties_1.defineReadOnly)(this, 'privateKey', (0, bytes_1.hexlify)(privateKeyBytes));
        (0, properties_1.defineReadOnly)(this, 'keyPair', new secp256k1_1.KeyPair(privateKeyBytes));
        (0, properties_1.defineReadOnly)(this, 'publicKey', this.keyPair.publicKey);
        (0, properties_1.defineReadOnly)(this, 'publicKeyType', this.keyPair.publicKeyType);
        (0, properties_1.defineReadOnly)(this, 'compressedPublicKey', this.keyPair.compressedPublicKey);
        (0, properties_1.defineReadOnly)(this, 'address', (0, secp256k1_1.computeAddress)(this.keyPair.publicKey));
        (0, properties_1.defineReadOnly)(this, 'hexAddress', (0, secp256k1_1.computeHexAddress)(this.address));
        (0, properties_1.setType)(this, 'SigningKey');
    }
    signDigest(digest) {
        return this.keyPair.sign(digest);
    }
    computeSharedSecret(key) {
        return this.keyPair.computeSharedSecret((0, bytes_1.arrayify)(key));
    }
    static isSigningKey(value) {
        return (0, properties_1.isType)(value, 'SigningKey');
    }
}
exports.SigningKey = SigningKey;
//# sourceMappingURL=signing-key.js.map