
import { getAddress } from './address';

export function isSecretStorageWallet(json: string): boolean {
    try {
        var data = JSON.parse(json);
    } catch (error) { return false; }

    if (!data.version || parseInt(data.version) !== data.version || parseInt(data.version) !== 3) {
        return false;
    }

    // @TODO: Put more checks to make sure it has kdf, iv and all that good stuff
    return true;
}

export function getJsonWalletAddress(json: string): string {
    if (isSecretStorageWallet(json)) {
        try {
            return getAddress(JSON.parse(json).address);
        } catch (error) { return null; }
    }

    return null;
}

