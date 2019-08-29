'use strict';

import bech32 from 'bech32';

import { arrayify } from './bytes';

///////////////////////////////
// Imported Types

import { Arrayish } from './bytes';

///////////////////////////////

export function decode(str: string, LIMIT?: number): { prefix: string, words: Arrayish }
{
    let result = bech32.decode(str, LIMIT);
    return {
        prefix: result.prefix,
        words: arrayify(result.words)
    };
}

export function encode(prefix: string, words: Arrayish, LIMIT?: number): string
{
    return bech32.encode(prefix, Buffer.from(arrayify(words)), LIMIT);
}

export function fromWords(words: Arrayish): Arrayish
{
    return arrayify(bech32.fromWords(Buffer.from(arrayify(words))));
}

export function toWords(bytes: Arrayish): Arrayish
{
    return bech32.toWords(Buffer.from(arrayify(bytes)));
}
