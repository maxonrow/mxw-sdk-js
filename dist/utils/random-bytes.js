'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const bytes_1 = require("./bytes");
const crypto_1 = require("crypto");
function randomBytes(length) {
    return bytes_1.arrayify(crypto_1.randomBytes(length));
}
exports.randomBytes = randomBytes;
//# sourceMappingURL=random-bytes.js.map