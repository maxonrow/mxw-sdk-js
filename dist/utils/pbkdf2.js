'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const bytes_1 = require("./bytes");
function bufferify(value) {
    return Buffer.from(bytes_1.arrayify(value));
}
function pbkdf2(password, salt, iterations, keylen, hashAlgorithm) {
    return bytes_1.arrayify(crypto_1.pbkdf2Sync(bufferify(password), bufferify(salt), iterations, keylen, hashAlgorithm));
}
exports.pbkdf2 = pbkdf2;
//# sourceMappingURL=pbkdf2.js.map