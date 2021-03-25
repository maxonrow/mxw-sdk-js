import { BigNumber } from './utils/bignumber';
declare const AddressPrefix = "mxw";
declare const ValOperatorAddressPrefix = "mxwvaloper";
declare const KycAddressPrefix = "kyc";
declare const AddressZero = "mxw1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgcpfl3";
declare const HashZero = "0x0000000000000000000000000000000000000000000000000000000000000000";
declare const ZeroFee: {
    amount: {
        amount: string;
        denom: string;
    }[];
    gas: string;
};
declare const NegativeOne: BigNumber;
declare const Zero: BigNumber;
declare const One: BigNumber;
declare const Two: BigNumber;
declare const CinPerMxw: BigNumber;
declare const MaxUint256: BigNumber;
export { ZeroFee, AddressPrefix, ValOperatorAddressPrefix, KycAddressPrefix, AddressZero, HashZero, NegativeOne, Zero, One, Two, CinPerMxw, MaxUint256 };
