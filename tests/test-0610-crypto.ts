'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { utils } from '../src.ts/index';
import { arrayify } from '../src.ts/utils';
import { nodeProvider } from "./env";

let indent = "     ";
let silent = true;

describe('Suite: Crypto', function () {
    if (silent) { silent = nodeProvider.trace.silent; }

    it("Generate encryption key using pbkdf2", function () {
        let key = arrayify(utils.pbkdf2("any strong password", "0x0", 1, 32, "sha256"));
        expect(key).to.exist;
        expect(key.length).to.equal(32);
        if (!silent) console.log(indent, "Key:", key);
    });

});
