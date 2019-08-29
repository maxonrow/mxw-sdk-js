'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors = __importStar(require("../errors"));
const bytes_1 = require("./bytes");
const utf8_1 = require("./utf8");
const keccak256_1 = require("./keccak256");
const sha2_1 = require("./sha2");
///////////////////////////////
const Zeros = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const Partition = new RegExp("^((.*)\\.)?([^.]+)$");
const UseSTD3ASCIIRules = new RegExp("^[a-z0-9.-]*$");
function namehash(name) {
    if (typeof (name) !== 'string') {
        errors.throwError('invalid address - ' + String(name), errors.INVALID_ARGUMENT, {
            argument: 'name',
            value: name
        });
    }
    name = name.toLowerCase();
    // Supporting the full UTF-8 space requires additional (and large)
    // libraries, so for now we simply do not support them.
    // It should be fairly easy in the future to support systems with
    // String.normalize, but that is future work.
    if (!name.match(UseSTD3ASCIIRules)) {
        errors.throwError('contains invalid UseSTD3ASCIIRules characters', errors.INVALID_ARGUMENT, {
            argument: 'name',
            value: name
        });
    }
    let result = Zeros;
    while (name.length) {
        let partition = name.match(Partition);
        let label = utf8_1.toUtf8Bytes(partition[3]);
        result = keccak256_1.keccak256(bytes_1.concat([result, keccak256_1.keccak256(label)]));
        name = partition[2] || '';
    }
    return bytes_1.hexlify(result);
}
exports.namehash = namehash;
function id(text) {
    return sha2_1.sha256(utf8_1.toUtf8Bytes(text));
}
exports.id = id;
function hashMessage(message) {
    let bytes = ((typeof (message) === 'string') ? utf8_1.toUtf8Bytes(message) : message);
    return sha2_1.sha256(bytes);
}
exports.hashMessage = hashMessage;
//# sourceMappingURL=hash.js.map