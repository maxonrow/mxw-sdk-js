'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { utils } from '../src.ts/index';
import { bigNumberify, toUtf8Bytes } from '../src.ts/utils';
import { nodeProvider } from "./env";

let indent = "     ";
let silent = true;

describe('Suite: Utils', function () {
    if (silent) { silent = nodeProvider.trace.silent; }

    it("Test bytes", function () {
        expect(utils.isHexString("0x01")).to.be.true;
    });

    it("Test shallow copy properties", function () {
        let object = {
            hello: 1,
            helloWorld: "123"
        };
        let copied = utils.shallowCopy(object);
        expect(copied).to.exist;
        expect(copied.hello).to.equal(1);
        expect(copied.helloWorld).to.equal("123");
    });

    it("Test camelize", function () {
        let object = {
            Hello: 1,
            hello_world: "123"
        };
        let converted = utils.camelize(object);
        expect(converted).to.exist;
        expect(converted.Hello).to.exist;
        expect(converted.helloWorld).to.exist;
    });

    it("Test unit convert to blockchain format (readable => bigNumber)", function () {
        let readable = "12345678.90";
        let bn = utils.parseMxw(readable);
        if (!silent) console.log(indent, "BigNumber:", readable, "=>", bn.toString());
        expect(bn.toString()).to.equal("12345678900000000000000000");
    });

    it("Test unit convert to blockchain format with 18 decimals (readable => bigNumber)", function () {
        let readable = "12345678.90";
        let converted = utils.parseUnits(readable, 18);
        if (!silent) console.log(indent, "BigNumber:", readable, "=>", converted.toString());
        expect(converted.toString()).to.equal("12345678900000000000000000");
    });

    it("Test unit convert to readable format (bigNumber => readable)", function () {
        let value = bigNumberify("1234567890");
        let converted = utils.formatMxw(value);
        if (!silent) console.log(indent, "Readable:", value.toString(), "=>", converted);
        expect(converted).to.equal("0.00000000123456789");
    });

    it("Test unit convert to readable format with 18 decimals (bigNumber => readable)", function () {
        let value = bigNumberify("12345678900000000000000000");
        let converted = utils.formatUnits(value, 18);
        if (!silent) console.log(indent, "Readable:", value.toString(), "=>", converted);
        expect(converted).to.equal("12345678.9");
    });

    it("Validate address", function () {
        let address = "mxw1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgcpfl3";

        let hexAddress = utils.computeHexAddress(address);
        expect(hexAddress).to.be.equal("0x0000000000000000000000000000000000000000");
        if (!silent) console.log(indent, "Hex Address:", hexAddress);
    });

    it("Convert hex address", function () {
        let hexAddress = "0x0000000000000000000000000000000000000000";

        let address = utils.computeAddress(hexAddress);
        expect(address).to.be.equal("mxw1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgcpfl3");
        if (!silent) console.log(indent, "Address:", address);
    });

    it("Normalize bech32 address", function () {
        let address = "mxw15f3aw83y2hgzzs6hk6utputr2xchwe5x745l9s";
        let normalized = utils.getAddress(address);
        if (!silent) console.log(indent, "Normalize:", normalized);
    });

    it("Normalize hex address", function () {
        let address = "0xa263d71e2455d0214357b6b8b0f16351b1776686";
        let normalized = utils.getAddress(address);
        if (!silent) console.log(indent, "Normalize:", normalized);
        expect("0xa263D71e2455d0214357B6b8B0F16351b1776686").to.equal(normalized);
    });

    it("Generate random hash value", function () {
        let hash = utils.getHash(utils.randomBytes(32));
        if (!silent) console.log(indent, hash);
    });

    it("Test SHA256 hash value", function () {
        let hash = utils.sha256(toUtf8Bytes("Hello, blockchain"));
        if (!silent) console.log(indent, hash);
        expect("0x6cabdb6b53060a1961f7cceede7e07022505a83870fadb64f9699074150f033e").to.equal(hash);
    });

    it("Verify transaction signature", function () {
        let encodedPublicKey = "A4Rfxov1OSvWeIZZnLjT5SCa4PQCclSg1/YdwqAqlvt7";
        let publicKey = utils.base64.decode(encodedPublicKey);
        let from = utils.computeAddress(publicKey);
    
        let signaturePayload = '';
        let signature = "";
    
        if (signaturePayload && signature) {
            let result = utils.verify(signaturePayload, signature, from);
            expect(result).to.equal(true);
        }
    });
        
    it("Adhoc test", function () {
        
    });

});
