'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';
import { nodeProvider } from "./env";

let indent = "     ";
let silent = true;

describe('Suite: Constants', function () {
    if (silent) { silent = nodeProvider.trace.silent; }

    it("version", function () {
        let version = mxw.version;
        expect(version).to.exist;
        if (!silent) console.log(indent, "Version:", version);
    });

    it("constant variables should exists", function () {
        let constants = mxw.constants;
        expect(constants).to.exist;
    });
});
