/**
 *  SigningKey
 *
 *
 */
import { HDNode } from './hdnode';
import { Arrayish, Signature } from './bytes';
import { Wordlist } from '.';
export declare class SigningKey {
    readonly privateKey: string;
    readonly publicKey: string;
    readonly publicKeyType: string;
    readonly compressedPublicKey: string;
    readonly address: string;
    readonly hexAddress: string;
    readonly mnemonic: string;
    readonly path: string;
    readonly wordlist: Wordlist;
    private readonly keyPair;
    constructor(privateKey: Arrayish | HDNode);
    signDigest(digest: Arrayish): Signature;
    computeSharedSecret(key: Arrayish | string): string;
    static isSigningKey(value: any): value is SigningKey;
}
