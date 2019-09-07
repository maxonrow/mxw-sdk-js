"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const N = bignumber_1.bigNumberify("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
// "Bitcoin seed"
const MasterSecret = utf8_1.toUtf8Bytes('Bitcoin seed');
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
    return bytes_1.hexZeroPad(bytes_1.hexlify(value), 32);
}
function base58check(data) {
    let checksum = bytes_1.hexDataSlice(sha2_1.sha256(sha2_1.sha256(data)), 0, 4);
    return basex_1.Base58.encode(bytes_1.concat([data, checksum]));
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
            properties_1.defineReadOnly(this, 'privateKey', keyPair.privateKey);
            properties_1.defineReadOnly(this, 'publicKey', keyPair.compressedPublicKey);
        }
        else {
            properties_1.defineReadOnly(this, 'privateKey', null);
            properties_1.defineReadOnly(this, 'publicKey', bytes_1.hexlify(publicKey));
        }
        properties_1.defineReadOnly(this, 'parentFingerprint', parentFingerprint);
        properties_1.defineReadOnly(this, 'fingerprint', bytes_1.hexDataSlice(sha2_1.ripemd160(sha2_1.sha256(this.publicKey)), 0, 4));
        properties_1.defineReadOnly(this, 'address', secp256k1_1.computeAddress(this.publicKey));
        properties_1.defineReadOnly(this, 'chainCode', chainCode);
        properties_1.defineReadOnly(this, 'index', index);
        properties_1.defineReadOnly(this, 'depth', depth);
        properties_1.defineReadOnly(this, 'mnemonic', mnemonic);
        properties_1.defineReadOnly(this, 'wordlist', wordlist);
        properties_1.defineReadOnly(this, 'path', path);
        properties_1.setType(this, 'HDNode');
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
        return base58check(bytes_1.concat([
            ((this.privateKey != null) ? "0x0488ADE4" : "0x0488B21E"),
            bytes_1.hexlify(this.depth),
            this.parentFingerprint,
            bytes_1.hexZeroPad(bytes_1.hexlify(this.index), 4),
            this.chainCode,
            ((this.privateKey != null) ? bytes_1.concat(["0x00", this.privateKey]) : this.publicKey),
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
            data.set(bytes_1.arrayify(this.privateKey), 1);
            // Hardened path
            if (path) {
                path += "'";
            }
        }
        else {
            // Data = ser_p(point(k_par))
            data.set(bytes_1.arrayify(this.publicKey));
        }
        // Data += ser_32(i)
        for (let i = 24; i >= 0; i -= 8) {
            data[33 + (i >> 3)] = ((index >> (24 - i)) & 0xff);
        }
        let I = hmac_1.computeHmac(hmac_1.SupportedAlgorithms.sha512, this.chainCode, data);
        let IL = I.slice(0, 32);
        let IR = I.slice(32);
        // The private key
        let ki = null;
        // The public key
        let Ki = null;
        if (this.privateKey) {
            ki = bytes32(bignumber_1.bigNumberify(IL).add(this.privateKey).mod(N));
        }
        else {
            let ek = new secp256k1_1.KeyPair(bytes_1.hexlify(IL));
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
        return properties_1.isType(value, 'HDNode');
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
    let parentFingerprint = bytes_1.hexlify(bytes.slice(5, 9));
    let index = parseInt(bytes_1.hexlify(bytes.slice(9, 13)).substring(2), 16);
    let chainCode = bytes_1.hexlify(bytes.slice(13, 45));
    let key = bytes.slice(45, 78);
    switch (bytes_1.hexlify(bytes.slice(0, 4))) {
        // Public Key
        case "0x0488b21e":
        case "0x043587cf":
            return new HDNode(_constructorGuard, null, bytes_1.hexlify(key), parentFingerprint, chainCode, index, depth, null, null, null);
        // Private Key
        case "0x0488ade4":
        case "0x04358394 ":
            if (key[0] !== 0) {
                break;
            }
            return new HDNode(_constructorGuard, bytes_1.hexlify(key.slice(1)), null, parentFingerprint, chainCode, index, depth, null, null, null);
    }
    return errors.throwError("invalid extended key", errors.INVALID_ARGUMENT, {
        argument: "extendedKey",
        value: "[REDACTED]"
    });
}
exports.fromExtendedKey = fromExtendedKey;
function _fromSeed(seed, mnemonic, wordlist) {
    let seedArray = bytes_1.arrayify(seed);
    if (seedArray.length < 16 || seedArray.length > 64) {
        throw new Error('invalid seed');
    }
    let I = bytes_1.arrayify(hmac_1.computeHmac(hmac_1.SupportedAlgorithms.sha512, MasterSecret, seedArray));
    return new HDNode(_constructorGuard, bytes32(I.slice(0, 32)), null, "0x00000000", bytes32(I.slice(32)), 0, 0, mnemonic, 'm', wordlist);
}
function fromMnemonic(mnemonic, wordlist, password) {
    // Check that the checksum s valid (will throw an error)
    mnemonicToEntropy(mnemonic, wordlist);
    return _fromSeed(mnemonicToSeed(mnemonic, password), mnemonic, wordlist);
}
exports.fromMnemonic = fromMnemonic;
function fromSeed(seed) {
    return _fromSeed(seed, null);
}
exports.fromSeed = fromSeed;
function mnemonicToSeed(mnemonic, password) {
    if (!password) {
        password = '';
    }
    let salt = utf8_1.toUtf8Bytes('mnemonic' + password, utf8_1.UnicodeNormalizationForm.NFKD);
    return bytes_1.hexlify(pbkdf2_1.pbkdf2(utf8_1.toUtf8Bytes(mnemonic, utf8_1.UnicodeNormalizationForm.NFKD), salt, 2048, 64, 'sha512'));
}
exports.mnemonicToSeed = mnemonicToSeed;
function mnemonicToEntropy(mnemonic, wordlist) {
    if (!wordlist) {
        wordlist = lang_en_1.langEn;
    }
    errors.checkNormalize();
    let words = wordlist.split(mnemonic);
    if ((words.length % 3) !== 0) {
        throw new Error('invalid mnemonic');
    }
    let entropy = bytes_1.arrayify(new Uint8Array(Math.ceil(11 * words.length / 8)));
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
    let checksum = bytes_1.arrayify(sha2_1.sha256(entropy.slice(0, entropyBits / 8)))[0];
    checksum &= checksumMask;
    if (checksum !== (entropy[entropy.length - 1] & checksumMask)) {
        throw new Error('invalid checksum');
    }
    return bytes_1.hexlify(entropy.slice(0, entropyBits / 8));
}
exports.mnemonicToEntropy = mnemonicToEntropy;
function entropyToMnemonic(entropy, wordlist) {
    entropy = bytes_1.arrayify(entropy);
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
    let checksum = bytes_1.arrayify(sha2_1.sha256(entropy))[0];
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
exports.entropyToMnemonic = entropyToMnemonic;
function isValidMnemonic(mnemonic, wordlist) {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
        return true;
    }
    catch (error) { }
    return false;
}
exports.isValidMnemonic = isValidMnemonic;
//# sourceMappingURL=hdnode.js.map