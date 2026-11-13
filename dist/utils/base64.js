'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = decode;
exports.encode = encode;
const bytes_1 = require("./bytes");
///////////////////////////////
function decode(textData) {
    return (0, bytes_1.arrayify)(new Uint8Array(Buffer.from(textData, 'base64')));
}
;
function encode(data) {
    return Buffer.from((0, bytes_1.arrayify)(data)).toString('base64');
}
//# sourceMappingURL=base64.js.map