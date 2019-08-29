import { Arrayish, Signature } from './bytes';
import { BigNumberish } from './bignumber';
import { Provider, TransactionFee, TransactionRequest } from '../providers/abstract-provider';
export declare type UnsignedTransaction = {
    type?: string;
    value?: {
        msg?: Array<{
            type: string;
            value: any;
        }>;
        fee?: {
            amount?: Array<{
                denom: string;
                amount: BigNumberish;
            }>;
            gas: BigNumberish;
        };
        memo?: string;
    };
};
export interface Transaction {
    type?: string;
    value?: {
        fee?: TransactionFee | Promise<TransactionFee>;
        memo?: string;
        msg?: Array<{
            type: string;
            value: any;
        }>;
        signatures?: Array<{
            publicKey: {
                type: string;
                value: string;
            };
            signature: string;
        }>;
    };
    fee?: TransactionFee | Promise<TransactionFee>;
    checkTransaction?: {
        gasWanted?: BigNumberish;
        gasUsed?: BigNumberish;
    };
    deliverTransaction?: {
        log?: TransactionLog | string;
        gasWanted?: BigNumberish;
        gasUsed?: BigNumberish;
        tags?: Array<{
            key: string;
            value: string;
        }>;
    };
    hash?: string;
    blockNumber?: number;
}
export interface TransactionLog {
    success: boolean;
    info: {
        nonce: BigNumberish;
        hash: string;
        message?: string;
    };
}
export declare function serialize(unsignedTransaction: UnsignedTransaction, signature?: Arrayish | Signature, publicKey?: string): string;
export declare function parse(rawTransaction: any): Transaction;
export declare function populateTransaction(transaction: any, provider: Provider, from: string | Promise<string>): Promise<Transaction>;
export declare function getTransactionRequest(route: string, transactionType: string, overrides?: any): TransactionRequest;
