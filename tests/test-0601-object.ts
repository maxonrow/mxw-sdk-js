'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
    checkFormat, checkNumber, checkString, checkBigNumber, checkBoolean, allowNull, allowNullOrEmpty, notAllowNull, notAllowNullOrEmpty, checkHex,
    checkNumberString, expectTypeOf, checkBigNumberString
} from "../src.ts/utils/misc";
import { BigNumber, bigNumberify } from '../src.ts/utils/bignumber';
import { errors, version } from '../src.ts';

describe('Suite : Object', function () {
    it("checkFormat", function () {
        let values: {
            a: number,
            b: string,
            c: BigNumber,
            d: boolean,
            e: {
                e1: string,
                e2?: BigNumber
            },
            f: string,
            g: string,
            somethingExtra: string
        } = {
            a: 123,
            b: "hello",
            c: bigNumberify("12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890"),
            d: true,
            e: {
                e1: "world",
                e2: bigNumberify("987654321")
            },
            f: "0x123",
            g: "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789",
            somethingExtra: "free gift for you!"
        };

        let object: {
            a: number,
            b: string,
            c: BigNumber,
            d: boolean,
            e: {
                e1: string,
                e2?: BigNumber
            },
            f: string,
            g: string
        } = checkFormat({
            a: expectTypeOf(checkNumber, "number"),
            b: expectTypeOf(checkString, "string"),
            c: checkBigNumber,
            d: expectTypeOf(checkBoolean, "boolean"),
            e: {
                e1: expectTypeOf(checkString, "string"),
                e2: allowNullOrEmpty(expectTypeOf(checkBigNumber, "object"))
            },
            f: checkHex,
            g: expectTypeOf(checkBigNumberString, "string"),
        }, values);
        expect(object).to.exist;
        expect(object.a).to.eq(123);
        expect(object.b).to.eq("hello");
        expect(object.c.eq("12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890")).to.true;
        expect(object.d).to.true;
        expect(object.e.e1).to.eq("world");
        expect(object.e.e2.eq("987654321")).to.true;
        expect(object.f).to.eq("0x123");
        expect(object.g).to.eq("1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789");
        expect(object["somethingExtra"]).to.not.exist;
    });

    it("checkFormat - should catch missing value", function () {
        let object = {
            a: "hello"
        };
        try {
            checkFormat({ a: checkString, b: checkString }, object);
            errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
        }
        catch (error) {
            expect(errors.MISSING_ARGUMENT).to.eq(error.code);
            expect('missing object key b (key="b", object={"a":"hello"}, version=' + version + ')').to.eq(error.message);
        }
    });

    it("checkFormat - should cater optional value", function () {
        {
            let object = {
                a: "hello"
            };
            object = checkFormat({ a: notAllowNull(checkString) }, object);
            object = checkFormat({ a: notAllowNullOrEmpty(checkString) }, object);
            object = checkFormat({ a: checkString, b: allowNull(checkString) }, object);
            object = checkFormat({ a: checkString, b: allowNullOrEmpty(checkString) }, object);

            expect(object["a"]).is.exist;
            expect(object["b"]).is.not.exist;
        }
        {
            let object = {
                a: "hello"
            };
            object = checkFormat({ a: checkString, b: allowNullOrEmpty(checkString) }, object);

            expect(object["a"]).is.exist;
            expect(object["b"]).is.not.exist;
        }
    });

    it("checkFormat - should catch invalid data type", function () {
        let object = {
            a: "hello",
            b: 123
        };
        try {
            checkFormat({ a: checkString, b: expectTypeOf(checkString, "string") }, object);
            errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
        }
        catch (error) {
            expect(errors.INVALID_FORMAT).to.eq(error.code);
            expect('invalid format object key b: expected type string, but number (value=123, key="b", object={"a":"hello","b":123}, version=' + version + ')').to.eq(error.message);
        }
    });

    it("checkFormat - should cater optional value for data type check", function () {
        {
            let object = {
                a: "hello"
            };
            object = checkFormat({ a: notAllowNullOrEmpty(expectTypeOf(checkString, "string")) }, object);
            object = checkFormat({ a: checkString, b: allowNull(expectTypeOf(checkString, "string")) }, object);
            object = checkFormat({ a: checkString, b: allowNullOrEmpty(expectTypeOf(checkString, "string")) }, object);

            expect(object["a"]).is.exist;
            expect(object["a"]).is.an("string");
            expect(object["b"]).is.not.exist;
        }
        {
            let object = {
                a: "hello",
                b: "world"
            };
            object = checkFormat({ a: notAllowNullOrEmpty(expectTypeOf(checkString, "string")), b: notAllowNullOrEmpty(expectTypeOf(checkString, "string")) }, object);
            object = checkFormat({ a: checkString, b: allowNull(expectTypeOf(checkString, "string")) }, object);
            object = checkFormat({ a: checkString, b: allowNullOrEmpty(expectTypeOf(checkString, "string")) }, object);

            expect(object["a"]).is.exist;
            expect(object["a"]).is.an("string");
            expect(object["b"]).is.exist;
            expect(object["b"]).is.an("string");
        }
    });

    it("checkFormat - should catch invalid number", function () {
        {
            let object = {
                a: 123,
                b: "abc"
            };
            try {
                checkFormat({ a: checkNumber, b: checkNumber }, object);
                errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
            }
            catch (error) {
                expect(errors.INVALID_FORMAT).to.eq(error.code);
                expect('invalid format object key b: invalid BigNumber string value (value="abc", key="b", object={"a":123,"b":"abc"}, version=' + version + ')').to.eq(error.message);
            }
        }
        {
            let object = {
                a: "123",
                b: "abc"
            };
            try {
                checkFormat({ a: checkNumberString, b: checkNumberString }, object);
                errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
            }
            catch (error) {
                expect(errors.INVALID_FORMAT).to.eq(error.code);
                expect('invalid format object key b: invalid BigNumber string value (value="abc", key="b", object={"a":"123","b":"abc"}, version=' + version + ')').to.eq(error.message);
            }
        }
    });

    it("checkFormat - should catch invalid string", function () {
        let object = {
            a: "hello",
            b: 123
        };
        try {
            checkFormat({ a: checkString, b: checkString }, object);
            errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
        }
        catch (error) {
            expect(errors.INVALID_FORMAT).to.eq(error.code);
            expect('invalid format object key b: invalid string (value=123, key="b", object={"a":"hello","b":123}, version=' + version + ')').to.eq(error.message);
        }
    });

    it("checkFormat - should catch invalid BigNumber", function () {
        let object = {
            a: "123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123",
            b: "abc"
        };
        try {
            checkFormat({ a: checkBigNumber, b: checkBigNumber }, object);
            errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
        }
        catch (error) {
            expect(errors.INVALID_FORMAT).to.eq(error.code);
            expect('invalid format object key b: invalid BigNumber string value (value="abc", key="b", object={"a":"123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123","b":"abc"}, version=' + version + ')').to.eq(error.message);
        }
    });

    it("checkFormat - should catch invalid boolean", function () {
        let object = {
            a: true,
            b: 123
        };
        try {
            checkFormat({ a: checkBoolean, b: checkBoolean }, object);
            errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
        }
        catch (error) {
            expect(errors.INVALID_FORMAT).to.eq(error.code);
            expect("invalid format object key b: invalid boolean - " + object.b + ' (value=123, key="b", object={"a":true,"b":123}, version=' + version + ')').to.eq(error.message);
        }
    });

    it("checkFormat - should catch invalid hex string", function () {
        let object = {
            a: "0x123",
            b: "0xXYZ"
        };
        try {
            checkFormat({ a: checkHex, b: checkHex }, object);
            errors.throwError("SHOULD_NOT_REACH_HERE", "", {});
        }
        catch (error) {
            expect(errors.INVALID_FORMAT).to.eq(error.code);
            expect("invalid format object key b: invalid hex - " + object.b + ' (value="0xXYZ", key="b", object={"a":"0x123","b":"0xXYZ"}, version=' + version + ')').to.eq(error.message);
        }
    });

});
