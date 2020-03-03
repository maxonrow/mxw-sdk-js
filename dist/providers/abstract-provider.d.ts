import { BigNumber } from '../utils/bignumber';
import { BigNumberish } from '../utils/bignumber';
import { Network } from '../utils/networks';
import { OnceBlockable } from '../utils/web';
import { Transaction, TransactionLog } from '../utils/transaction';
export interface KeyValue {
    key: string;
    value: string;
}
export interface TypeAttribute {
    type: string;
    attributes: Array<KeyValue>;
}
export interface Status {
}
export interface TokenList {
    fungible: string[];
    nonFungible: string[];
}
export interface AliasState {
    name: string;
    approved: boolean;
    owner: string;
    metadata: string;
    fee: BigNumber;
}
export interface TokenState {
    flags: number;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: BigNumber;
    maxSupply: BigNumber;
    owner: string;
    newOwner: string;
    metadata: string;
}
export interface NFTokenState {
    flags: number;
    name: string;
    symbol: string;
    owner: string;
    newOwner: string;
    metadata: string;
    mintLimit: BigNumber;
    transferLimit: BigNumber;
    endorserList: string[];
    totalSupply: BigNumber;
}
export interface NFTokenItemState {
    id: string;
    properties: string[];
    metadata: string[];
    transferLimit: BigNumber;
    frozen: boolean;
}
export interface TokenAccountState {
    owner: string;
    frozen: boolean;
    balance: BigNumber;
}
export interface AccountState {
    type: string;
    value: {
        address: string;
        coins: [{
            denom: string;
            amount: BigNumberish;
        }];
        publicKey: {
            type: string;
            value: string;
        };
        accountNumber: BigNumberish;
        sequence: BigNumberish;
    };
}
export interface Block {
    blockNumber: number;
    blockTime: string;
    totalTransactions: number;
    proposerAddress: string;
    results: {
        transactions: Array<BlockTransaction>;
    };
}
export interface BlockInfo {
    blockNumber: number;
    blockTime: string;
    totalTransactions: number;
    proposerAddress: string;
}
export interface BlockTransaction {
    hash: string;
    logs: Array<TransactionLog> | string;
    events: Array<TransactionEvent>;
    nonce: BigNumberish;
    transactionIndex: number;
}
export interface TransactionEvent {
    address: string;
    transactionIndex: number;
    eventIndex: number;
    hash: string;
    params: Array<string>;
}
export declare type BlockTag = string | number;
export declare type TransactionFee = {
    amount: Array<{
        denom: string;
        amount: BigNumber;
    }>;
    gas: BigNumber;
};
export declare type TransactionFeeSetting = {
    min: BigNumberish;
    max: BigNumberish;
    percentage: BigNumberish;
};
export declare type TransactionSignature = {
    publicKey: {
        type: string;
        value: string;
    };
    signature: string;
};
export declare type TransactionRequest = {
    type?: string;
    value?: {
        msg?: Array<{
            type: string;
            value: any;
        }>;
        fee?: TransactionFee | Promise<TransactionFee>;
        signatures?: Array<TransactionSignature>;
        memo?: string;
    };
    nonce?: BigNumberish | Promise<BigNumberish>;
    accountNumber?: BigNumberish | Promise<BigNumberish>;
    chainId?: string | Promise<string>;
    fee?: TransactionFee | Promise<TransactionFee>;
};
export interface TransactionResponse extends TransactionReceipt {
    wait: (confirmations?: number) => Promise<TransactionReceipt>;
}
export interface DeliverTransaction {
    hash: string;
    log: TransactionLog;
    nonce: BigNumberish;
}
export interface TransactionReceipt extends Transaction {
    deliverTransaction: DeliverTransaction;
    result: {
        logs: Array<TransactionLog> | string;
        events: Array<TransactionEvent>;
    };
    payload: any;
    hash: string;
    blockNumber?: number;
    nonce: BigNumberish;
    status: number;
    confirmations: number;
}
export declare type EventType = string | Array<string>;
export declare type Listener = (...args: Array<any>) => void;
export declare abstract class Provider implements OnceBlockable {
    abstract getNetwork(): Promise<Network>;
    abstract getBlockNumber(): Promise<number>;
    abstract getTransactionRequest(route: string, transactionType: string, overrides?: any): TransactionRequest;
    abstract getTransactionFee(route: string, transactionType: string, overrides?: any): Promise<TransactionFee>;
    abstract getTransactionFeeSetting(transactionType: string, overrides?: any): Promise<TransactionFeeSetting>;
    abstract getStatus(): Promise<Status>;
    abstract getTokenState(symbol: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenState>;
    abstract getTokenList(blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenList>;
    abstract getTokenAccountState(symbol: string | Promise<string>, address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenAccountState>;
    abstract getNFTokenState(symbol: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<NFTokenState>;
    abstract getNFTokenItemState(symbol: string | Promise<string>, itemID: string, blockTag?: BlockTag | Promise<BlockTag>): Promise<NFTokenItemState>;
    abstract getAccountState(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AccountState>;
    abstract getAccountNumber(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    abstract getBalance(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    abstract getTransactionCount(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    abstract sendTransaction(signedTransaction: string | Promise<string>, overrides?: any): Promise<TransactionResponse>;
    abstract getBlock(blockTag: BlockTag | Promise<BlockTag>): Promise<Block>;
    abstract getTransaction(transactionHash: string): Promise<TransactionResponse>;
    abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;
    abstract checkTransactionReceipt(receipt: TransactionReceipt, code?: string, message?: string, params?: any): any;
    abstract isWhitelisted(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<boolean>;
    abstract getKycAddress(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract resolveName(name: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract lookupAddress(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract getAliasState(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AliasState>;
    abstract on(eventName: EventType, listener: Listener): Provider;
    abstract once(eventName: EventType, listener: Listener): Provider;
    abstract listenerCount(eventName?: EventType): number;
    abstract listeners(eventName: EventType): Array<Listener>;
    abstract removeAllListeners(eventName?: EventType): Provider;
    abstract removeListener(eventName: EventType, listener: Listener): Provider;
    abstract waitForTransaction(transactionHash: string, confirmations?: number): Promise<TransactionReceipt>;
    constructor();
    static isProvider(value: any): value is Provider;
}
