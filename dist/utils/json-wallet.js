"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSecretStorageWallet = isSecretStorageWallet;
exports.getJsonWalletAddress = getJsonWalletAddress;
const address_1 = require("./address");
function isSecretStorageWallet(json) {
    try {
        var data = JSON.parse(json);
    }
    catch (error) {
        return false;
    }
    if (!data.version || parseInt(data.version) !== data.version || parseInt(data.version) !== 3) {
        return false;
    }
    // @TODO: Put more checks to make sure it has kdf, iv and all that good stuff
    return true;
}
function getJsonWalletAddress(json) {
    if (isSecretStorageWallet(json)) {
        try {
            return (0, address_1.getAddress)(JSON.parse(json).address);
        }
        catch (error) {
            return null;
        }
    }
    return null;
}
//# sourceMappingURL=json-wallet.js.map