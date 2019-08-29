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
    if (_1.isUndefinedOrNullOrEmpty(network.chainId) && network.chainId !== n.chainId) {
        errors.throwError('network chainId mismatch', errors.INVALID_ARGUMENT, { arg: 'network', value: network });
    }
    // Standard Network
    return {
        name: network.name,
        chainId: n.chainId,
        _defaultProvider: (network._defaultProvider || n._defaultProvider || null)
    };
}
exports.getNetwork = getNetwork;
//# sourceMappingURL=networks.js.map