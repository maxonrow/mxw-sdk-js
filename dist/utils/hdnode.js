"use strict";
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
exports.HDNode = exports.defaultPath = void 0;
exports.fromExtendedKey = fromExtendedKey;
exports.fromMnemonic = fromMnemonic;
exports.fromSeed = fromSeed;
exports.mnemonicToSeed = mnemonicToSeed;
exports.mnemonicToEntropy = mnemonicToEntropy;
exports.entropyToMnemonic = entropyToMnemonic;
exports.isValidMnemonic = isValidMnemonic;
// See: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
// See: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
const errors = __importStar(require("../errors"));
// The English language word list.
// For additional word lists, please see /src.tc/wordlists/
const lang_en_1 = require("../wordlists/lang-en");
// Automatically register English?
//import { register } from '../wordlists/wordlist';
//register(langEn);
const basex_1 = require("./basex");
const bytes_1 = require("./bytes");
const bignumber_1 = require("./bignumber");
const utf8_1 = require("./utf8");
const pbkdf2_1 = require("./pbkdf2");
const hmac_1 = require("./hmac");
const properties_1 = require("./properties");
const secp256k1_1 = require("./secp256k1");
const sha2_1 = require("./sha2");
const N = (0, bignumber_1.bigNumberify)("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
// "Bitcoin seed"
const MasterSecret = (0, utf8_1.toUtf8Bytes)('Bitcoin seed');
const HardenedBit = 0x80000000;
// Returns a byte with the MSB bits set
function getUpperMask(bits) {
    return ((1 << bits) - 1) << (8 - bits);
}
// Returns a byte with the LSB bits set
function getLowerMask(bits) {
    return (1 << bits) - 1;
}
function bytes32(value) {
    return (0, bytes_1.hexZeroPad)((0, bytes_1.hexlify)(value), 32);
}
function base58check(data) {
    let checksum = (0, bytes_1.hexDataSlice)((0, sha2_1.sha256)((0, sha2_1.sha256)(data)), 0, 4);
    return basex_1.Base58.encode((0, bytes_1.concat)([data, checksum]));
}
const _constructorGuard = {};
exports.defaultPath = "m/44'/376'/0'/0/0";
class HDNode {
    /**
     *  This constructor should not be called directly.
     *
     *  Please use:
     *   - fromMnemonic
     *   - fromSeed
     */
    constructor(constructorGuard, privateKey, publicKey, parentFingerprint, chainCode, index, depth, mnemonic, path, wordlist) {
        errors.checkNew(this, HDNode);
        if (constructorGuard !== _constructorGuard) {
            throw new Error('HDNode constructor cannot be called directly');
        }
        if (privateKey) {
            let keyPair = new secp256k1_1.KeyPair(privateKey);
            (0, properties_1.defineReadOnly)(this, 'privateKey', keyPair.privateKey);
            (0, properties_1.defineReadOnly)(this, 'publicKey', keyPair.compressedPublicKey);
        }
        else {
            (0, properties_1.defineReadOnly)(this, 'privateKey', null);
            (0, properties_1.defineReadOnly)(this, 'publicKey', (0, bytes_1.hexlify)(publicKey));
        }
        (0, properties_1.defineReadOnly)(this, 'parentFingerprint', parentFingerprint);
        (0, properties_1.defineReadOnly)(this, 'fingerprint', (0, bytes_1.hexDataSlice)((0, sha2_1.ripemd160)((0, sha2_1.sha256)(this.publicKey)), 0, 4));
        (0, properties_1.defineReadOnly)(this, 'address', (0, secp256k1_1.computeAddress)(this.publicKey));
        (0, properties_1.defineReadOnly)(this, 'chainCode', chainCode);
        (0, properties_1.defineReadOnly)(this, 'index', index);
        (0, properties_1.defineReadOnly)(this, 'depth', depth);
        (0, properties_1.defineReadOnly)(this, 'mnemonic', mnemonic);
        (0, properties_1.defineReadOnly)(this, 'wordlist', wordlist);
        (0, properties_1.defineReadOnly)(this, 'path', path);
        (0, properties_1.setType)(this, 'HDNode');
    }
    get extendedKey() {
        // We only support the mainnet values for now, but if anyone needs
        // testnet values, let me know. I believe current senitment is that
        // we should always use mainnet, and use BIP-44 to derive the network
        //   - Mainnet: public=0x0488B21E, private=0x0488ADE4
        //   - Testnet: public=0x043587CF, private=0x04358394
        if (this.depth >= 256) {
            throw new Error("Depth too large!");
        }
        return base58check((0, bytes_1.concat)([
            ((this.privateKey != null) ? "0x0488ADE4" : "0x0488B21E"),
            (0, bytes_1.hexlify)(this.depth),
            this.parentFingerprint,
            (0, bytes_1.hexZeroPad)((0, bytes_1.hexlify)(this.index), 4),
            this.chainCode,
            ((this.privateKey != null) ? (0, bytes_1.concat)(["0x00", this.privateKey]) : this.publicKey),
        ]));
    }
    neuter() {
        return new HDNode(_constructorGuard, null, this.publicKey, this.parentFingerprint, this.chainCode, this.index, this.depth, null, this.path, this.wordlist);
    }
    _derive(index) {
        if (index > 0xffffffff) {
            throw new Error("invalid index - " + String(index));
        }
        // Base path
        let path = this.path;
        if (path) {
            path += '/' + (index & ~HardenedBit);
        }
        let data = new Uint8Array(37);
        if (index & HardenedBit) {
            if (!this.privateKey) {
                throw new Error('cannot derive child of neutered node');
            }
            // Data = 0x00 || ser_256(k_par)
            data.set((0, bytes_1.arrayify)(this.privateKey), 1);
            // Hardened path
            if (path) {
                path += "'";
            }
        }
        else {
            // Data = ser_p(point(k_par))
            data.set((0, bytes_1.arrayify)(this.publicKey));
        }
        // Data += ser_32(i)
        for (let i = 24; i >= 0; i -= 8) {
            data[33 + (i >> 3)] = ((index >> (24 - i)) & 0xff);
        }
        let I = (0, hmac_1.computeHmac)(hmac_1.SupportedAlgorithms.sha512, this.chainCode, data);
        let IL = I.slice(0, 32);
        let IR = I.slice(32);
        // The private key
        let ki = null;
        // The public key
        let Ki = null;
        if (this.privateKey) {
            ki = bytes32((0, bignumber_1.bigNumberify)(IL).add(this.privateKey).mod(N));
        }
        else {
            let ek = new secp256k1_1.KeyPair((0, bytes_1.hexlify)(IL));
            Ki = ek._addPoint(this.publicKey);
        }
        return new HDNode(_constructorGuard, ki, Ki, this.fingerprint, bytes32(IR), index, this.depth + 1, this.mnemonic, path, this.wordlist);
    }
    derivePath(path) {
        let components = path.split('/');
        if (components.length === 0 || (components[0] === 'm' && this.depth !== 0)) {
            throw new Error('invalid path - ' + path);
        }
        if (components[0] === 'm') {
            components.shift();
        }
        let result = this;
        for (let i = 0; i < components.length; i++) {
            let component = components[i];
            if (component.match(/^[0-9]+'$/)) {
                let index = parseInt(component.substring(0, component.length - 1));
                if (index >= HardenedBit) {
                    throw new Error('invalid path index - ' + component);
                }
                result = result._derive(HardenedBit + index);
            }
            else if (component.match(/^[0-9]+$/)) {
                let index = parseInt(component);
                if (index >= HardenedBit) {
                    throw new Error('invalid path index - ' + component);
                }
                result = result._derive(index);
            }
            else {
                throw new Error('invalid path component - ' + component);
            }
        }
        return result;
    }
    static isHDNode(value) {
        return (0, properties_1.isType)(value, 'HDNode');
    }
}
exports.HDNode = HDNode;
function fromExtendedKey(extendedKey) {
    let bytes = basex_1.Base58.decode(extendedKey);
    if (bytes.length !== 82 || base58check(bytes.slice(0, 78)) !== extendedKey) {
        errors.throwError("invalid extended key", errors.INVALID_ARGUMENT, {
            argument: "extendedKey",
            value: "[REDACTED]"
        });
    }
    let depth = bytes[4];
    let parentFingerprint = (0, bytes_1.hexlify)(bytes.slice(5, 9));
    let index = parseInt((0, bytes_1.hexlify)(bytes.slice(9, 13)).substring(2), 16);
    let chainCode = (0, bytes_1.hexlify)(bytes.slice(13, 45));
    let key = bytes.slice(45, 78);
    switch ((0, bytes_1.hexlify)(bytes.slice(0, 4))) {
        // Public Key
        case "0x0488b21e":
        case "0x043587cf":
            return new HDNode(_constructorGuard, null, (0, bytes_1.hexlify)(key), parentFingerprint, chainCode, index, depth, null, null, null);
        // Private Key
        case "0x0488ade4":
        case "0x04358394 ":
            if (key[0] !== 0) {
                break;
            }
            return new HDNode(_constructorGuard, (0, bytes_1.hexlify)(key.slice(1)), null, parentFingerprint, chainCode, index, depth, null, null, null);
    }
    return errors.throwError("invalid extended key", errors.INVALID_ARGUMENT, {
        argument: "extendedKey",
        value: "[REDACTED]"
    });
}
function _fromSeed(seed, mnemonic, wordlist) {
    let seedArray = (0, bytes_1.arrayify)(seed);
    if (seedArray.length < 16 || seedArray.length > 64) {
        throw new Error('invalid seed');
    }
    let I = (0, bytes_1.arrayify)((0, hmac_1.computeHmac)(hmac_1.SupportedAlgorithms.sha512, MasterSecret, seedArray));
    return new HDNode(_constructorGuard, bytes32(I.slice(0, 32)), null, "0x00000000", bytes32(I.slice(32)), 0, 0, mnemonic, 'm', wordlist);
}
function fromMnemonic(mnemonic, wordlist, password) {
    // Normalize the mnemonic (also throws if the checksum is invalid)
    mnemonic = entropyToMnemonic(mnemonicToEntropy(mnemonic, wordlist), wordlist);
    return _fromSeed(mnemonicToSeed(mnemonic, password), mnemonic, wordlist);
}
function fromSeed(seed) {
    return _fromSeed(seed, null);
}
function mnemonicToSeed(mnemonic, password) {
    if (!password) {
        password = '';
    }
    let salt = (0, utf8_1.toUtf8Bytes)('mnemonic' + password, utf8_1.UnicodeNormalizationForm.NFKD);
    return (0, bytes_1.hexlify)((0, pbkdf2_1.pbkdf2)((0, utf8_1.toUtf8Bytes)(mnemonic, utf8_1.UnicodeNormalizationForm.NFKD), salt, 2048, 64, 'sha512'));
}
function mnemonicToEntropy(mnemonic, wordlist) {
    if (!wordlist) {
        wordlist = lang_en_1.langEn;
    }
    errors.checkNormalize();
    let words = wordlist.split(mnemonic);
    if ((words.length % 3) !== 0) {
        throw new Error('invalid mnemonic');
    }
    let entropy = (0, bytes_1.arrayify)(new Uint8Array(Math.ceil(11 * words.length / 8)));
    let offset = 0;
    for (let i = 0; i < words.length; i++) {
        let index = wordlist.getWordIndex(words[i].normalize('NFKD'));
        if (index === -1) {
            throw new Error('invalid mnemonic');
        }
        for (let bit = 0; bit < 11; bit++) {
            if (index & (1 << (10 - bit))) {
                entropy[offset >> 3] |= (1 << (7 - (offset % 8)));
            }
            offset++;
        }
    }
    let entropyBits = 32 * words.length / 3;
    let checksumBits = words.length / 3;
    let checksumMask = getUpperMask(checksumBits);
    let checksum = (0, bytes_1.arrayify)((0, sha2_1.sha256)(entropy.slice(0, entropyBits / 8)))[0];
    checksum &= checksumMask;
    if (checksum !== (entropy[entropy.length - 1] & checksumMask)) {
        throw new Error('invalid checksum');
    }
    return (0, bytes_1.hexlify)(entropy.slice(0, entropyBits / 8));
}
function entropyToMnemonic(entropy, wordlist) {
    entropy = (0, bytes_1.arrayify)(entropy);
    if ((entropy.length % 4) !== 0 || entropy.length < 16 || entropy.length > 32) {
        throw new Error('invalid entropy');
    }
    let indices = [0];
    let remainingBits = 11;
    for (let i = 0; i < entropy.length; i++) {
        // Consume the whole byte (with still more to go)
        if (remainingBits > 8) {
            indices[indices.length - 1] <<= 8;
            indices[indices.length - 1] |= entropy[i];
            remainingBits -= 8;
            // This byte will complete an 11-bit index
        }
        else {
            indices[indices.length - 1] <<= remainingBits;
            indices[indices.length - 1] |= entropy[i] >> (8 - remainingBits);
            // Start the next word
            indices.push(entropy[i] & getLowerMask(8 - remainingBits));
            remainingBits += 3;
        }
    }
    // Compute the checksum bits
    let checksum = (0, bytes_1.arrayify)((0, sha2_1.sha256)(entropy))[0];
    let checksumBits = entropy.length / 4;
    checksum &= getUpperMask(checksumBits);
    // Shift the checksum into the word indices
    indices[indices.length - 1] <<= checksumBits;
    indices[indices.length - 1] |= (checksum >> (8 - checksumBits));
    if (!wordlist) {
        wordlist = lang_en_1.langEn;
    }
    return wordlist.join(indices.map((index) => wordlist.getWord(index)));
}
function isValidMnemonic(mnemonic, wordlist) {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
        return true;
    }
    catch (error) { }
    return false;
}
//# sourceMappingURL=hdnode.js.map