import { SigningKey } from './signing-key';
import { Arrayish } from './bytes';
import { Wordlist } from './wordlist';
export declare type ProgressCallback = (percent: number) => void;
export declare type EncryptOptions = {
    iv?: Arrayish;
    entropy?: Arrayish;
    mnemonic?: string;
    path?: string;
    client?: string;
    salt?: Arrayish;
    uuid?: string;
    scrypt?: {
        N?: number;
        r?: number;
        p?: number;
    };
    locale?: Wordlist;
};
export declare function decrypt(json: string, password: Arrayish, progressCallback?: ProgressCallback): Promise<SigningKey>;
export declare function encrypt(privateKey: Arrayish | SigningKey, password: Arrayish | string, options?: EncryptOptions, progressCallback?: ProgressCallback): Promise<string>;
