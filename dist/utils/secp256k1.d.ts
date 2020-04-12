/// <reference types="node" />
import { Arrayish, Signature } from './bytes';
export declare function hash(algorithm: string, data: string | Buffer): Buffer;
export declare class KeyPair {
    readonly privateKey: string;
    readonly publicKey: string;
    readonly publicKeyType: string;
    readonly compressedPublicKey: string;
    readonly publicKeyBytes: Uint8Array;
    constructor(privateKey: Arrayish | string);
    sign(digest: Arrayish | string): Signature;
    computeSharedSecret(otherKey: Arrayish | string): string;
    _addPoint(other: Arrayish | string): string;
}
export declare function computePublicKey(key: Arrayish | string, compressed?: boolean): string;
export declare function computeAddress(key: Arrayish | string, prefix?: string): string;
export declare function computeHexAddress(address: string): string;
export declare function recoverPublicKey(digest: Arrayish | string, signature: Signature | string, recoveryParam?: number): string;
export declare function recoverAddress(digest: Arrayish | string, signature: Signature | string, recoveryParam?: number): string;
export declare function verifyMessage(message: Arrayish | string, signature: Signature | string, recoveryParam?: number): string;
export declare function verify(message: Arrayish | string, signature: Signature | string, address: string): boolean;
