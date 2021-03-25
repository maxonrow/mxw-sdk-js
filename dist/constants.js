'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_1 = require("./utils/bignumber");
const units_1 = require("./utils/units");
const AddressPrefix = 'mxw';
exports.AddressPrefix = AddressPrefix;
const ValOperatorAddressPrefix = 'mxwvaloper';
exports.ValOperatorAddressPrefix = ValOperatorAddressPrefix;
const KycAddressPrefix = 'kyc';
exports.KycAddressPrefix = KycAddressPrefix;
// Do we have a zero address?
const AddressZero = 'mxw1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgcpfl3';
exports.AddressZero = AddressZero;
const HashZero = '0x0000000000000000000000000000000000000000000000000000000000000000';
exports.HashZero = HashZero;
const ZeroFee = {
    amount: [
        {
            amount: '0',
            denom: units_1.smallestUnitName
        },
    ],
    gas: '0'
};
exports.ZeroFee = ZeroFee;
const NegativeOne = bignumber_1.bigNumberify(-1);
exports.NegativeOne = NegativeOne;
const Zero = bignumber_1.bigNumberify(0);
exports.Zero = Zero;
const One = bignumber_1.bigNumberify(1);
exports.One = One;
const Two = bignumber_1.bigNumberify(2);
exports.Two = Two;
const CinPerMxw = bignumber_1.bigNumberify('1000000000000000000');
exports.CinPerMxw = CinPerMxw;
const MaxUint256 = bignumber_1.bigNumberify('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
exports.MaxUint256 = MaxUint256;
//# sourceMappingURL=constants.js.map