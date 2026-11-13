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
exports.defineReadOnly = defineReadOnly;
exports.setType = setType;
exports.isType = isType;
exports.changeKey = changeKey;
exports.camelize = camelize;
exports.resolveProperties = resolveProperties;
exports.checkProperties = checkProperties;
exports.shallowCopy = shallowCopy;
exports.deepCopy = deepCopy;
exports.inheritable = inheritable;
const errors = __importStar(require("../errors"));
const misc_1 = require("./misc");
function defineReadOnly(object, name, value) {
    Object.defineProperty(object, name, {
        enumerable: true,
        value: value,
        writable: false,
    });
}
// There are some issues with instanceof with npm link, so we use this
// to ensure types are what we expect.
function setType(object, type) {
    Object.defineProperty(object, '_objectType_', { configurable: false, value: type, writable: false });
}
function isType(object, type) {
    return (object && object._objectType_ === type);
}
function changeKey(object, name, newName) {
    if (!object || name == newName) {
        return;
    }
    if ("object" === typeof object) {
        let item = Object.getOwnPropertyDescriptor(object, name);
        if (item) {
            Object.defineProperty(object, newName, item);
        }
    }
    else {
        object[newName] = object[name];
    }
    delete object[name];
}
function camelize(object, rename, depth) {
    for (let key in object) {
        try {
            if (undefined == depth) {
                depth = 0;
            }
            if (object[key] && "object" === typeof object[key]) {
                let type = object[key].constructor ? object[key].constructor.name : "";
                switch (type) {
                    case "Object":
                    case "Array":
                        camelize(object[key], rename, depth + 1);
                }
            }
            let name = camelCase(key);
            if (rename) {
                name = rename(name, depth, object);
            }
            changeKey(object, key, name);
        }
        catch (error) {
            error.checkKey = key;
            error.checkValue = object[key];
            throw error;
        }
    }
    return object;
}
function camelCase(str) {
    return str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });
}
function resolveProperties(object) {
    let result = {};
    let promises = [];
    Object.keys(object).forEach((key) => {
        let value = object[key];
        if (value instanceof Promise) {
            promises.push(value.then((value) => {
                result[key] = value;
                return null;
            }));
        }
        else {
            result[key] = value;
        }
    });
    return Promise.all(promises).then(() => {
        return result;
    });
}
function checkProperties(object, properties, mandate) {
    if (!object || typeof (object) !== 'object') {
        errors.throwError('invalid object', errors.INVALID_ARGUMENT, {
            argument: 'object',
            value: object
        });
    }
    Object.keys(object).forEach((key) => {
        if ((0, misc_1.isUndefinedOrNull)(properties[key])) {
            errors.throwError('invalid object key - ' + key, errors.INVALID_ARGUMENT, {
                argument: 'transaction',
                value: object,
                key: key
            });
        }
    });
    if (mandate) {
        Object.keys(properties).forEach((key) => {
            if (properties[key] && (0, misc_1.isUndefinedOrNull)(object[key])) {
                errors.throwError('missing object key - ' + key, errors.MISSING_ARGUMENT, {
                    argument: 'transaction',
                    value: object,
                    key: key
                });
            }
        });
    }
}
function shallowCopy(object) {
    let result = {};
    for (var key in object) {
        result[key] = object[key];
    }
    return result;
}
let opaque = { boolean: true, number: true, string: true };
function deepCopy(object, frozen) {
    // Opaque objects are not mutable, so safe to copy by assignment
    if (object === undefined || object === null || opaque[typeof (object)]) {
        return object;
    }
    // Arrays are mutable, so we need to create a copy
    if (Array.isArray(object)) {
        let result = object.map((item) => deepCopy(item, frozen));
        if (frozen) {
            Object.freeze(result);
        }
        return result;
    }
    if (typeof (object) === 'object') {
        // Some internal objects, which are already immutable
        if (isType(object, 'BigNumber')) {
            return object;
        }
        if (isType(object, 'Description')) {
            return object;
        }
        if (isType(object, 'Indexed')) {
            return object;
        }
        let result = {};
        for (let key in object) {
            let value = object[key];
            if (value === undefined) {
                continue;
            }
            defineReadOnly(result, key, deepCopy(value, frozen));
        }
        if (frozen) {
            Object.freeze(result);
        }
        return result;
    }
    // The function type is also immutable, so safe to copy by assignment
    if (typeof (object) === 'function') {
        return object;
    }
    throw new Error('Cannot deepCopy ' + typeof (object));
}
// See: https://github.com/isaacs/inherits/blob/master/inherits_browser.js
function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
}
function inheritable(parent) {
    return function (child) {
        inherits(child, parent);
        defineReadOnly(child, 'inherits', inheritable(child));
    };
}
//# sourceMappingURL=properties.js.map