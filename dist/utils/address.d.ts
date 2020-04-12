import { BigNumber, Arrayish } from '.';
export declare function getAddress(address: string): string;
export declare function getHash(hash: Arrayish): string;
export declare function deriveAddress(from: string, nonce: Arrayish | BigNumber | number): string;
export declare function getMultiSigAddress(from: string, nonce: Arrayish | BigNumber | number): string;
