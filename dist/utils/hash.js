'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.namehash = namehash;
exports.id = id;
exports.hashMessage = hashMessage;
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
        let label = (0, utf8_1.toUtf8Bytes)(partition[3]);
        result = (0, keccak256_1.keccak256)((0, bytes_1.concat)([result, (0, keccak256_1.keccak256)(label)]));
        name = partition[2] || '';
    }
    return (0, bytes_1.hexlify)(result);
}
function id(text) {
    return (0, sha2_1.sha256)((0, utf8_1.toUtf8Bytes)(text));
}
function hashMessage(message) {
    let bytes = ((typeof (message) === 'string') ? (0, utf8_1.toUtf8Bytes)(message) : message);
    return (0, sha2_1.sha256)(bytes);
}
//# sourceMappingURL=hash.js.map