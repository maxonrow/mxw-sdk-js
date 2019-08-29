import { Arrayish } from './bytes';
export declare function decode(str: string, LIMIT?: number): {
    prefix: string;
    words: Arrayish;
};
export declare function encode(prefix: string, words: Arrayish, LIMIT?: number): string;
export declare function fromWords(words: Arrayish): Arrayish;
export declare function toWords(bytes: Arrayish): Arrayish;
