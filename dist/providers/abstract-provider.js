"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const properties_1 = require("../utils/properties");
;
;
;
;
;
;
;
;
;
;
;
///////////////////////////////
// Exported Abstracts
class Provider {
    constructor() {
        properties_1.setType(this, 'Provider');
    }
    static isProvider(value) {
        return properties_1.isType(value, 'Provider');
    }
}
exports.Provider = Provider;
//defineReadOnly(Signer, 'inherits', inheritable(Abstract));
//# sourceMappingURL=abstract-provider.js.map