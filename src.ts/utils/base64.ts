'use strict';

import { arrayify } from './bytes';

///////////////////////////////
// Imported Types

import { Arrayish } from './bytes';

///////////////////////////////

export function decode(textData: string): Uint8Array {
    return arrayify(new Uint8Array(Buffer.from(textData, 'base64')));
};

export function encode(data: Arrayish): string {
    return Buffer.from(arrayify(data)).toString('base64');
}
