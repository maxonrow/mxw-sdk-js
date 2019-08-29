'use strict';

import * as errors from '../errors';
import { isUndefinedOrNull } from './misc';

export function defineReadOnly(object: any, name: string, value: any): void {
    Object.defineProperty(object, name, {
        enumerable: true,
        value: value,
        writable: false,
    });
}

// There are some issues with instanceof with npm link, so we use this
// to ensure types are what we expect.

export function setType(object: any, type: string): void {
    Object.defineProperty(object, '_objectType_', { configurable: false, value: type, writable: false });
}

export function isType(object: any, type: string): boolean {
    return (object && object._objectType_ === type);
}

export function changeKey(object: any, name: string, newName: string): void {
    if (!object || name == newName) { return; }
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

export function camelize(object: any, rename?: (key: string, depth: number, object: any) => string, depth?: number): any {
    for (let key in object) {
        try {
            if (undefined == depth) { depth = 0; }

            if (object[key] && "object" === typeof object[key]) {
                let type = object[key].constructor ? object[key].constructor.name : "";
                switch(type) {
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
        } catch (error) {
            error.checkKey = key;
            error.checkValue = object[key];
            throw error;
        }
    }
    return object;
}

function camelCase(str: string) {
    return str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

export function resolveProperties(object: any): Promise<any> {
    let result: any = {};

    let promises: Array<Promise<void>> = [];
    Object.keys(object).forEach((key) => {
        let value = object[key];
        if (value instanceof Promise) {
            promises.push(
                value.then((value) => {
                    result[key] = value;
                    return null;
                })
            );
        } else {
            result[key] = value;
        }
    });

    return Promise.all(promises).then(() => {
        return result;
    });
}

export function checkProperties(object: any, properties: { [name: string]: boolean }, mandate?: boolean): void {
    if (!object || typeof (object) !== 'object') {
        errors.throwError('invalid object', errors.INVALID_ARGUMENT, {
            argument: 'object',
            value: object
        });
    }

    Object.keys(object).forEach((key) => {
        if (isUndefinedOrNull(properties[key])) {
            errors.throwError('invalid object key - ' + key, errors.INVALID_ARGUMENT, {
                argument: 'transaction',
                value: object,
                key: key
            });
        }
    });

    if (mandate) {
        Object.keys(properties).forEach((key) => {
            if (properties[key] && isUndefinedOrNull(object[key])) {
                errors.throwError('missing object key - ' + key, errors.MISSING_ARGUMENT, {
                    argument: 'transaction',
                    value: object,
                    key: key
                });
            }
        });
    }
}

export function shallowCopy(object: any): any {
    let result: any = {};
    for (var key in object) { result[key] = object[key]; }
    return result;
}

let opaque: { [key: string]: boolean } = { boolean: true, number: true, string: true };

export function deepCopy(object: any, frozen?: boolean): any {

    // Opaque objects are not mutable, so safe to copy by assignment
    if (object === undefined || object === null || opaque[typeof (object)]) { return object; }

    // Arrays are mutable, so we need to create a copy
    if (Array.isArray(object)) {
        let result = object.map((item) => deepCopy(item, frozen));
        if (frozen) { Object.freeze(result); }
        return result
    }

    if (typeof (object) === 'object') {

        // Some internal objects, which are already immutable
        if (isType(object, 'BigNumber')) { return object; }
        if (isType(object, 'Description')) { return object; }
        if (isType(object, 'Indexed')) { return object; }

        let result: { [key: string]: any } = {};
        for (let key in object) {
            let value = object[key];
            if (value === undefined) { continue; }
            defineReadOnly(result, key, deepCopy(value, frozen));
        }

        if (frozen) { Object.freeze(result); }

        return result;
    }

    // The function type is also immutable, so safe to copy by assignment
    if (typeof (object) === 'function') {
        return object;
    }

    throw new Error('Cannot deepCopy ' + typeof (object));
}

// See: https://github.com/isaacs/inherits/blob/master/inherits_browser.js
function inherits(ctor: any, superCtor: any): void {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
}

export function inheritable(parent: any): (child: any) => void {
    return function (child: any): void {
        inherits(child, parent);
        defineReadOnly(child, 'inherits', inheritable(child));
    }
}

