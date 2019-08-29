"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const properties_1 = require("./utils/properties");
class Signer {
    constructor() {
        properties_1.setType(this, 'Signer');
    }
    static isSigner(value) {
        return properties_1.isType(value, 'Signer');
    }
}
exports.Signer = Signer;
//defineReadOnly(Signer, 'inherits', inheritable(Signer));
//# sourceMappingURL=abstract-signer.js.map