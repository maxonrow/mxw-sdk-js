'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, utils } from '../src.ts/index';
import { arrayify, sha256, toUtf8Bytes, hexlify } from '../src.ts/utils';
import { nodeProvider } from "./env";

let indent = "     ";
let silent = true;

describe('Suite: Crypto', function () {
    if (silent) { silent = nodeProvider.trace.silent; }

    it("Generate encryption key using pbkdf2", function () {
        let component1 = sha256(toUtf8Bytes("any strong password"));
        let component2 = sha256(toUtf8Bytes("anything is ok"));
        let key = arrayify(utils.pbkdf2(component1, component2, 1, 32, "sha256"));
        expect(key).to.exist;
        expect(key.length).to.equal(32);
        if (!silent) console.log(indent, "Key:", JSON.stringify(key));
        hexlify(key)
    });

    it("Compute shared secret", function () {
        let wallet1 = mxw.Wallet.fromMnemonic(nodeProvider.kyc.provider);
        expect(wallet1).to.exist;
        if (!silent) console.log(indent, "Wallet1:", JSON.stringify(wallet1));

        let wallet2 = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer);
        expect(wallet1).to.exist;
        if (!silent) console.log(indent, "Wallet2:", JSON.stringify(wallet1));

        let secret1With2 = wallet1.computeSharedSecret(wallet1.publicKey);
        let secret2With1 = wallet2.computeSharedSecret(wallet2.publicKey);

        if (!silent) console.log(indent, "Shared secret wallet 1 with 2:", secret1With2);
        if (!silent) console.log(indent, "Shared secret wallet 2 with 1:", secret2With1);

        if (!silent) console.log(indent, utils.computeAddress(wallet1.publicKey), "publicKey:", wallet1.publicKey);
        if (!silent) console.log(indent, utils.computeAddress(wallet2.publicKey), "publicKey:", wallet2.publicKey);

        expect(secret1With2).to.equal(secret2With1);
    });

});
