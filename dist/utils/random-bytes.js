'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomBytes = randomBytes;
const bytes_1 = require("./bytes");
const crypto_1 = require("crypto");
function randomBytes(length) {
    return (0, bytes_1.arrayify)((0, crypto_1.randomBytes)(length));
}
//# sourceMappingURL=random-bytes.js.map