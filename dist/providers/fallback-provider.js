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
exports.FallbackProvider = void 0;
const base_provider_1 = require("./base-provider");
const errors = __importStar(require("../errors"));
// Returns:
//  - true is all networks match
//  - false if any network is null
//  - throws if any 2 networks do not match
function checkNetworks(networks) {
    var result = true;
    let check = null;
    networks.forEach((network) => {
        // Null
        if (network == null) {
            result = false;
            return;
        }
        // Have nothing to compre to yet
        if (check == null) {
            check = network;
            return;
        }
        // Matches!
        if (check.name === network.name &&
            check.chainId === network.chainId) {
            return;
        }
        errors.throwError('provider mismatch', errors.INVALID_ARGUMENT, { arg: 'networks', value: networks });
    });
    return result;
}
class FallbackProvider extends base_provider_1.BaseProvider {
    constructor(providers) {
        if (providers.length === 0) {
            throw new Error('no providers');
        }
        // All networks are ready, we can know the network for certain
        let ready = checkNetworks(providers.map((p) => p.network));
        if (ready) {
            super(providers[0].network);
        }
        else {
            // The network won't be known until all child providers know
            let ready = Promise.all(providers.map((p) => p.getNetwork())).then((networks) => {
                if (!checkNetworks(networks)) {
                    errors.throwError('getNetwork returned null', errors.UNKNOWN_ERROR, {});
                }
                return networks[0];
            });
            super(ready);
        }
        errors.checkNew(this, FallbackProvider);
        // Preserve a copy, so we don't get mutated
        this._providers = providers.slice(0);
    }
    get providers() {
        // Return a copy, so we don't get mutated
        return this._providers.slice(0);
    }
    perform(method, params) {
        // Creates a copy of the providers array
        var providers = this.providers;
        return new Promise((resolve, reject) => {
            var firstError = null;
            function next() {
                if (!providers.length) {
                    reject(firstError);
                    return;
                }
                var provider = providers.shift();
                provider.perform(method, params).then((result) => {
                    return resolve(result);
                }).catch((error) => {
                    if (!firstError) {
                        firstError = error;
                    }
                    setTimeout(next, 0);
                });
            }
            next();
        });
    }
}
exports.FallbackProvider = FallbackProvider;
//# sourceMappingURL=fallback-provider.js.map