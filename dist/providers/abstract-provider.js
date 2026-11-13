"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Provider = void 0;
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
///////////////////////////////
// Exported Abstracts
class Provider {
    constructor() {
        (0, properties_1.setType)(this, 'Provider');
    }
    static isProvider(value) {
        return (0, properties_1.isType)(value, 'Provider');
    }
}
exports.Provider = Provider;
//defineReadOnly(Signer, 'inherits', inheritable(Abstract));
//# sourceMappingURL=abstract-provider.js.map