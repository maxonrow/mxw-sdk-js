'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.pbkdf2 = pbkdf2;
const crypto_1 = require("crypto");
const bytes_1 = require("./bytes");
function bufferify(value) {
    return Buffer.from((0, bytes_1.arrayify)(value));
}
function pbkdf2(password, salt, iterations, keylen, hashAlgorithm) {
    return (0, bytes_1.arrayify)((0, crypto_1.pbkdf2Sync)(bufferify(password), bufferify(salt), iterations, keylen, hashAlgorithm));
}
//# sourceMappingURL=pbkdf2.js.map