'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ripemd160 = ripemd160;
exports.sha256 = sha256;
exports.sha512 = sha512;
const hash_js_1 = __importDefault(require("hash.js"));
const bytes_1 = require("./bytes");
function ripemd160(data) {
    return '0x' + (hash_js_1.default.ripemd160().update((0, bytes_1.arrayify)(data)).digest('hex'));
}
function sha256(data) {
    return '0x' + (hash_js_1.default.sha256().update((0, bytes_1.arrayify)(data)).digest('hex'));
}
function sha512(data) {
    return '0x' + (hash_js_1.default.sha512().update((0, bytes_1.arrayify)(data)).digest('hex'));
}
//# sourceMappingURL=sha2.js.map