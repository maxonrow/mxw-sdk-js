'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hash_js_1 = __importDefault(require("hash.js"));
const bytes_1 = require("./bytes");
function ripemd160(data) {
    return '0x' + (hash_js_1.default.ripemd160().update(bytes_1.arrayify(data)).digest('hex'));
}
exports.ripemd160 = ripemd160;
function sha256(data) {
    return '0x' + (hash_js_1.default.sha256().update(bytes_1.arrayify(data)).digest('hex'));
}
exports.sha256 = sha256;
function sha512(data) {
    return '0x' + (hash_js_1.default.sha512().update(bytes_1.arrayify(data)).digest('hex'));
}
exports.sha512 = sha512;
//# sourceMappingURL=sha2.js.map