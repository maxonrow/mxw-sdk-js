'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bech32_1 = __importDefault(require("bech32"));
const bytes_1 = require("./bytes");
///////////////////////////////
function decode(str, LIMIT) {
    let result = bech32_1.default.decode(str, LIMIT);
    return {
        prefix: result.prefix,
        words: bytes_1.arrayify(result.words)
    };
}
exports.decode = decode;
function encode(prefix, words, LIMIT) {
    return bech32_1.default.encode(prefix, Buffer.from(bytes_1.arrayify(words)), LIMIT);
}
exports.encode = encode;
function fromWords(words) {
    return bytes_1.arrayify(bech32_1.default.fromWords(Buffer.from(bytes_1.arrayify(words))));
}
exports.fromWords = fromWords;
function toWords(bytes) {
    return bech32_1.default.toWords(Buffer.from(bytes_1.arrayify(bytes)));
}
exports.toWords = toWords;
//# sourceMappingURL=bech32.js.map