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
exports.getNetwork = getNetwork;
const errors = __importStar(require("../errors"));
const _1 = require(".");
function mxwDefaultProvider(network) {
    return function (providers) {
        let providerList = [];
        // Some default providers should be added here
        providerList.push(new providers.JsonRpcProvider("https://to.be.define.maxonrow.com", network));
        if (providerList.length === 0) {
            return null;
        }
        if (providers.FallbackProvider) {
            return new providers.FallbackProvider(providerList);
            ;
        }
        return providerList[0];
    };
}
function etcDefaultProvider(url, network) {
    return function (providers) {
        if (providers.JsonRpcProvider) {
            return new providers.JsonRpcProvider(url, network);
        }
        return null;
    };
}
const homestead = {
    chainId: "maxonrow",
    name: "maxonrow",
    _defaultProvider: mxwDefaultProvider('homestead')
};
const testnet = {
    chainId: "alloys",
    name: "alloys",
    _defaultProvider: etcDefaultProvider('https://alloys-rpc.maxonrow.com', 'alloys')
};
const networks = {
    unspecified: {
        chainId: "0",
        name: 'unspecified'
    },
    homestead,
    mainnet: homestead,
    testnet
};
/**
 *  getNetwork
 *
 *  Converts a named common networks or chain ID (network ID) to a Network
 *  and verifies a network is a valid Network..
 */
function getNetwork(network) {
    // No network (null)
    if (network == null) {
        return null;
    }
    if (typeof (network) === 'number') {
        for (let name in networks) {
            let n = networks[name];
            if (n.chainId === network.toString()) {
                return {
                    name: n.name,
                    chainId: n.chainId,
                    _defaultProvider: (n._defaultProvider || null)
                };
            }
        }
        return {
            chainId: network.toString(),
            name: 'unknown'
        };
    }
    if (typeof (network) === 'string') {
        let n = networks[network];
        if (n == null) {
            return null;
        }
        return {
            name: n.name,
            chainId: n.chainId,
            _defaultProvider: (n._defaultProvider || null)
        };
    }
    let n = networks[network.name];
    // Not a standard network; check that it is a valid network in general
    if (!n) {
        if (typeof (network.chainId) === 'number') {
            network.chainId = String(network.chainId);
        }
        return network;
    }
    // Make sure the chainId matches the expected network chainId (or is 0; disable EIP-155)
    if ((0, _1.isUndefinedOrNullOrEmpty)(network.chainId) && network.chainId !== n.chainId) {
        errors.throwError('network chainId mismatch', errors.INVALID_ARGUMENT, { arg: 'network', value: network });
    }
    // Standard Network
    return {
        name: network.name,
        chainId: n.chainId,
        _defaultProvider: (network._defaultProvider || n._defaultProvider || null)
    };
}
//# sourceMappingURL=networks.js.map