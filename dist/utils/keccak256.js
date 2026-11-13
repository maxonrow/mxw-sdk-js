'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.keccak256 = keccak256;
const sha3 = require("js-sha3");
const bytes_1 = require("./bytes");
function keccak256(data) {
    return '0x' + sha3.keccak_256((0, bytes_1.arrayify)(data));
}
//# sourceMappingURL=keccak256.js.map