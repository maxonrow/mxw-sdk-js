'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const aes_js_1 = __importDefault(require("aes-js"));
const scrypt_js_1 = __importDefault(require("scrypt-js"));
const uuid_1 = __importDefault(require("uuid"));
const signing_key_1 = require("./signing-key");
const HDNode = __importStar(require("./hdnode"));
const address_1 = require("./address");
const bytes_1 = require("./bytes");
const pbkdf2_1 = require("./pbkdf2");
const sha2_1 = require("./sha2");
const utf8_1 = require("./utf8");
const random_bytes_1 = require("./random-bytes");
const wordlists_1 = require("../wordlists");
function looseArrayify(hexString) {
    if (typeof (hexString) === 'string' && hexString.substring(0, 2) !== '0x') {
        hexString = '0x' + hexString;
    }
    return bytes_1.arrayify(hexString);
}
function zpad(value, length) {
    value = String(value);
    while (value.length < length) {
        value = '0' + value;
    }
    return value;
}
function getPassword(password) {
    if (typeof (password) === 'string') {
        return utf8_1.toUtf8Bytes(password, utf8_1.UnicodeNormalizationForm.NFKC);
    }
    return bytes_1.arrayify(password);
}
// Search an Object and its children recursively, caselessly.
function searchPath(object, path) {
    var currentChild = object;
    var comps = path.toLowerCase().split('/');
    for (var i = 0; i < comps.length; i++) {
        // Search for a child object with a case-insensitive matching key
        var matchingChild = null;
        for (var key in currentChild) {
            if (key.toLowerCase() === comps[i]) {
                matchingChild = currentChild[key];
                break;
            }
        }
        // Didn't find one. :'(
        if (matchingChild === null) {
            return null;
        }
        // Now check this child...
        currentChild = matchingChild;
    }
    return currentChild;
}
//@TODO: string or arrayish
function decrypt(json, password, progressCallback) {
    var data = JSON.parse(json);
    let passwordBytes = getPassword(password);
    var decrypt = function (key, ciphertext) {
        var iv = looseArrayify(searchPath(data, 'crypto/cipherparams/iv'));
        var counter = new aes_js_1.default.Counter(iv);
        var aesCtr = new aes_js_1.default.ModeOfOperation.ctr(key, counter);
        return bytes_1.arrayify(aesCtr.decrypt(ciphertext));
    };
    var computeMAC = function (derivedHalf, ciphertext) {
        return sha2_1.sha256(bytes_1.concat([derivedHalf, ciphertext]));
    };
    var getSigningKey = function (key, reject) {
        var ciphertext = looseArrayify(searchPath(data, 'crypto/ciphertext'));
        var computedMAC;
        var privateKey;
        var mnemonicKey;
        var cipher = searchPath(data, 'crypto/cipher');
        if (cipher === 'aes-256-ctr') {
            if (80 !== key.length) {
                reject(new Error('invalid cipher dk length'));
                return null;
            }
            privateKey = decrypt(key.slice(0, 32), ciphertext);
            mnemonicKey = key.slice(48, 80);
            computedMAC = bytes_1.hexlify(computeMAC(key.slice(32, 48), ciphertext)).substring(2);
        }
        else if (cipher === 'aes-128-ctr') {
            if (64 !== key.length) {
                reject(new Error('invalid cipher dk length'));
                return null;
            }
            privateKey = decrypt(key.slice(0, 16), ciphertext);
            mnemonicKey = key.slice(32, 64);
            computedMAC = bytes_1.hexlify(computeMAC(key.slice(16, 32), ciphertext)).substring(2);
        }
        else {
            reject(new Error('unsupported cipher'));
            return null;
        }
        if (computedMAC !== searchPath(data, 'crypto/mac').toLowerCase()) {
            reject(new Error('invalid password'));
            return null;
        }
        var signingKey = new signing_key_1.SigningKey(privateKey);
        if (signingKey.address !== address_1.getAddress(data.address)) {
            reject(new Error('address mismatch'));
            return null;
        }
        // Version 0.1 x-mxw metadata must contain an encrypted mnemonic phrase
        if (searchPath(data, 'x-mxw/version') === '0.1') {
            var mnemonicCiphertext = looseArrayify(searchPath(data, 'x-mxw/mnemonicCiphertext'));
            var mnemonicIv = looseArrayify(searchPath(data, 'x-mxw/mnemonicCounter'));
            var mnemonicCounter = new aes_js_1.default.Counter(mnemonicIv);
            var mnemonicAesCtr = new aes_js_1.default.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
            var path = searchPath(data, 'x-mxw/path') || HDNode.defaultPath;
            var entropy = bytes_1.arrayify(mnemonicAesCtr.decrypt(mnemonicCiphertext));
            var locale = searchPath(data, 'x-mxw/locale') || undefined;
            var mnemonic = HDNode.entropyToMnemonic(entropy, wordlists_1.locales[locale]);
            var node = HDNode.fromMnemonic(mnemonic, wordlists_1.locales[locale]).derivePath(path);
            if (node.privateKey != bytes_1.hexlify(privateKey)) {
                reject(new Error('mnemonic mismatch'));
                return null;
            }
            signingKey = new signing_key_1.SigningKey(node);
        }
        return signingKey;
    };
    return new Promise(function (resolve, reject) {
        var kdf = searchPath(data, 'crypto/kdf');
        if (kdf && typeof (kdf) === 'string') {
            if (kdf.toLowerCase() === 'scrypt') {
                var salt = looseArrayify(searchPath(data, 'crypto/kdfparams/salt'));
                var N = parseInt(searchPath(data, 'crypto/kdfparams/n'));
                var r = parseInt(searchPath(data, 'crypto/kdfparams/r'));
                var p = parseInt(searchPath(data, 'crypto/kdfparams/p'));
                if (!N || !r || !p) {
                    reject(new Error('unsupported key-derivation function parameters'));
                    return;
                }
                // Make sure N is a power of 2
                if ((N & (N - 1)) !== 0) {
                    reject(new Error('unsupported key-derivation function parameter value for N'));
                    return;
                }
                var dkLen = parseInt(searchPath(data, 'crypto/kdfparams/dklen'));
                if (dkLen !== 32 && dkLen !== 48) {
                    reject(new Error('unsupported key-derivation derived-key length'));
                    return;
                }
                if (progressCallback) {
                    progressCallback(0);
                }
                scrypt_js_1.default(passwordBytes, salt, N, r, p, dkLen + 32, function (error, progress, key) {
                    if (error) {
                        error.progress = progress;
                        reject(error);
                    }
                    else if (key) {
                        key = bytes_1.arrayify(key);
                        var signingKey = getSigningKey(key, reject);
                        if (!signingKey) {
                            return;
                        }
                        if (progressCallback) {
                            progressCallback(1);
                        }
                        resolve(signingKey);
                    }
                    else if (progressCallback) {
                        return progressCallback(progress);
                    }
                });
            }
            else if (kdf.toLowerCase() === 'pbkdf2') {
                var salt = looseArrayify(searchPath(data, 'crypto/kdfparams/salt'));
                var prfFunc = null;
                var prf = searchPath(data, 'crypto/kdfparams/prf');
                if (prf === 'hmac-sha256') {
                    prfFunc = 'sha256';
                }
                else if (prf === 'hmac-sha512') {
                    prfFunc = 'sha512';
                }
                else {
                    reject(new Error('unsupported prf'));
                    return;
                }
                var c = parseInt(searchPath(data, 'crypto/kdfparams/c'));
                var dkLen = parseInt(searchPath(data, 'crypto/kdfparams/dklen'));
                if (dkLen !== 32 && dkLen !== 48) {
                    reject(new Error('unsupported key-derivation derived-key length'));
                    return;
                }
                var key = pbkdf2_1.pbkdf2(passwordBytes, salt, c, dkLen + 32, prfFunc);
                var signingKey = getSigningKey(key, reject);
                if (!signingKey) {
                    return;
                }
                resolve(signingKey);
            }
            else {
                reject(new Error('unsupported key-derivation function'));
            }
        }
        else {
            reject(new Error('unsupported key-derivation function'));
        }
    });
}
exports.decrypt = decrypt;
function encrypt(privateKey, password, options, progressCallback) {
    // the options are optional, so adjust the call as needed
    if (typeof (options) === 'function' && !progressCallback) {
        progressCallback = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    // Check the private key
    let privateKeyBytes = null;
    if (signing_key_1.SigningKey.isSigningKey(privateKey)) {
        privateKeyBytes = bytes_1.arrayify(privateKey.privateKey);
    }
    else {
        privateKeyBytes = bytes_1.arrayify(privateKey);
    }
    if (privateKeyBytes.length !== 32) {
        throw new Error('invalid private key');
    }
    let passwordBytes = getPassword(password);
    let entropy = null;
    if (options.entropy) {
        entropy = bytes_1.arrayify(options.entropy);
    }
    if (options.mnemonic) {
        if (entropy) {
            if (HDNode.entropyToMnemonic(entropy, options ? options.locale : undefined) !== options.mnemonic) {
                throw new Error('entropy and mnemonic mismatch');
            }
        }
        else {
            entropy = bytes_1.arrayify(HDNode.mnemonicToEntropy(options.mnemonic, options ? options.locale : undefined));
        }
    }
    var path = options.path;
    if (entropy && !path) {
        path = HDNode.defaultPath;
    }
    var client = options.client;
    if (!client) {
        client = "mxw-sdk";
    }
    // Check/generate the salt
    let salt = null;
    if (options.salt) {
        salt = bytes_1.arrayify(options.salt);
    }
    else {
        salt = random_bytes_1.randomBytes(32);
        ;
    }
    // Override initialization vector
    let iv = null;
    if (options.iv) {
        iv = bytes_1.arrayify(options.iv);
        if (iv.length !== 16) {
            throw new Error('invalid iv');
        }
    }
    else {
        iv = random_bytes_1.randomBytes(16);
    }
    // Override the uuid
    var uuidRandom = null;
    if (options.uuid) {
        uuidRandom = bytes_1.arrayify(options.uuid);
        if (uuidRandom.length !== 16) {
            throw new Error('invalid uuid');
        }
    }
    else {
        uuidRandom = random_bytes_1.randomBytes(16);
    }
    // Override the scrypt password-based key derivation function parameters
    var N = (1 << 17), r = 8, p = 1;
    if (options.scrypt) {
        if (options.scrypt.N) {
            N = options.scrypt.N;
        }
        if (options.scrypt.r) {
            r = options.scrypt.r;
        }
        if (options.scrypt.p) {
            p = options.scrypt.p;
        }
    }
    return new Promise(function (resolve, reject) {
        if (progressCallback) {
            progressCallback(0);
        }
        // We take 80 bytes:
        //   - 48 bytes   As normal for the Web3 secret storage (derivedKey, macPrefix)
        //   - 32 bytes   AES key to encrypt mnemonic with (required here to be MXW Wallet)
        scrypt_js_1.default(passwordBytes, salt, N, r, p, 80, function (error, progress, key) {
            if (error) {
                error.progress = progress;
                reject(error);
            }
            else if (key) {
                key = bytes_1.arrayify(key);
                // This will be used to encrypt the wallet (as per Web3 secret storage)
                var derivedKey = key.slice(0, 32);
                var macPrefix = key.slice(32, 48);
                // This will be used to encrypt the mnemonic phrase (if any)
                var mnemonicKey = key.slice(48, 80);
                // Get the address for this private key
                var address = (new signing_key_1.SigningKey(privateKeyBytes)).address;
                // Encrypt the private key
                var counter = new aes_js_1.default.Counter(iv);
                var aesCtr = new aes_js_1.default.ModeOfOperation.ctr(derivedKey, counter);
                var ciphertext = bytes_1.arrayify(aesCtr.encrypt(privateKeyBytes));
                // Compute the message authentication code, used to check the password
                var mac = sha2_1.sha256(bytes_1.concat([macPrefix, ciphertext]));
                // See: https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
                var data = {
                    address: address.toLowerCase(),
                    id: uuid_1.default.v4({ random: uuidRandom }),
                    version: 3,
                    Crypto: {
                        cipher: 'aes-256-ctr',
                        cipherparams: {
                            iv: bytes_1.hexlify(iv).substring(2),
                        },
                        ciphertext: bytes_1.hexlify(ciphertext).substring(2),
                        kdf: 'scrypt',
                        kdfparams: {
                            salt: bytes_1.hexlify(salt).substring(2),
                            n: N,
                            dklen: 48,
                            p: p,
                            r: r
                        },
                        mac: mac.substring(2)
                    }
                };
                // If we have a mnemonic, encrypt it into the JSON wallet
                if (entropy) {
                    var mnemonicIv = random_bytes_1.randomBytes(16);
                    var mnemonicCounter = new aes_js_1.default.Counter(mnemonicIv);
                    var mnemonicAesCtr = new aes_js_1.default.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
                    var mnemonicCiphertext = bytes_1.arrayify(mnemonicAesCtr.encrypt(entropy));
                    var now = new Date();
                    var timestamp = (now.getUTCFullYear() + '-' +
                        zpad(now.getUTCMonth() + 1, 2) + '-' +
                        zpad(now.getUTCDate(), 2) + 'T' +
                        zpad(now.getUTCHours(), 2) + '-' +
                        zpad(now.getUTCMinutes(), 2) + '-' +
                        zpad(now.getUTCSeconds(), 2) + '.0Z');
                    data['x-mxw'] = {
                        client: client,
                        filename: ('UTC--' + timestamp + '--' + data.address),
                        mnemonicCounter: bytes_1.hexlify(mnemonicIv).substring(2),
                        mnemonicCiphertext: bytes_1.hexlify(mnemonicCiphertext).substring(2),
                        path: path,
                        locale: (options && options.locale) ? options.locale.locale : undefined,
                        version: "0.1"
                    };
                }
                if (progressCallback) {
                    progressCallback(1);
                }
                resolve(JSON.stringify(data));
            }
            else if (progressCallback) {
                return progressCallback(progress);
            }
        });
    });
}
exports.encrypt = encrypt;
//# sourceMappingURL=secret-storage.js.map