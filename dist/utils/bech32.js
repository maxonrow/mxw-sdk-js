'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = decode;
exports.encode = encode;
exports.fromWords = fromWords;
exports.toWords = toWords;
const bech32_1 = __importDefault(require("bech32"));
const bytes_1 = require("./bytes");
///////////////////////////////
function decode(str, LIMIT) {
    let result = bech32_1.default.decode(str, LIMIT);
    return {
        prefix: result.prefix,
        words: (0, bytes_1.arrayify)(result.words)
    };
}
function encode(prefix, words, LIMIT) {
    return bech32_1.default.encode(prefix, Buffer.from((0, bytes_1.arrayify)(words)), LIMIT);
}
function fromWords(words) {
    return (0, bytes_1.arrayify)(bech32_1.default.fromWords(Buffer.from((0, bytes_1.arrayify)(words))));
}
function toWords(bytes) {
    return bech32_1.default.toWords(Buffer.from((0, bytes_1.arrayify)(bytes)));
}
//# sourceMappingURL=bech32.js.map