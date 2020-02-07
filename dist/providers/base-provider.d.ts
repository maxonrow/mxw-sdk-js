import { BigNumber } from '../utils/bignumber';
import { TransactionRequest } from '.';
import { Provider, TransactionFeeSetting } from './abstract-provider';
import { Block, BlockTag, EventType, Listener, AccountState, AliasState, TokenState, NFTokenState, NFTokenItemState, TokenList, TokenAccountState, TransactionReceipt, TransactionResponse, TransactionFee } from './abstract-provider';
import { Transaction } from '../utils/transaction';
import { Network, Networkish } from '../utils/networks';
export declare class BaseProvider extends Provider {
    private _network;
    private _events;
    protected _emitted: {
        [eventName: string]: number | 'pending';
    };
    private _pollingInterval;
    private _poller;
    private _lastBlockNumber;
    private _balances;
    private _fastBlockNumber;
    private _fastBlockNumberPromise;
    private _fastQueryDate;
    /**
     *  ready
     *
     *  A Promise<Network> that resolves only once the provider is ready.
     *
     *  Sub-classes that call the super with a network without a chainId
     *  MUST set this. Standard named networks have a known chainId.
     *
     */
    protected ready: Promise<Network>;
    constructor(network: Networkish | Promise<Network>);
    getBlockNumber(): Promise<number>;
    getTransactionRequest(route: string, transactionType: string, overrides?: any): TransactionRequest;
    getTransactionFee(route: string, transactionType: string, overrides?: any): Promise<TransactionFee>;
    getTransactionFeeSetting(transactionType: string, overrides?: any): Promise<TransactionFeeSetting>;
    getStatus(): Promise<any>;
    getTokenState(symbol: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenState>;
    getTokenList(blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenList>;
    getTokenAccountState(symbol: string | Promise<string>, addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<TokenAccountState>;
    getNFTokenState(symbol: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<NFTokenState>;
    getNFTokenItemState(symbol: string | Promise<string>, itemID: string, blockTag?: BlockTag | Promise<BlockTag>): Promise<NFTokenItemState>;
    getAliasState(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AliasState>;
    getAccountState(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AccountState>;
    getAccountNumber(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    getBalance(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    getTransactionCount(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    sendTransaction(signedTransaction: string | Promise<string>, overrides?: any): Promise<TransactionResponse>;
    _wrapTransaction(tx: Transaction, hash?: string, blockNumber?: number): TransactionResponse;
    getBlock(blockTag: BlockTag | Promise<BlockTag>): Promise<Block>;
    getTransaction(transactionHash: string): Promise<TransactionResponse>;
    checkTransactionReceipt(receipt: TransactionReceipt, code?: string, message?: string, params?: any): any;
    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;
    getPrice(): Promise<number>;
    isWhitelisted(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<boolean>;
    getKycAddress(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    resolveName(name: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    lookupAddress(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    static checkTransactionReceipt(transaction: any): TransactionReceipt;
    doPoll(): void;
    perform(method: string, params: any): Promise<any>;
    checkResponseLog(method: string, result: any, code?: string, message?: string, params?: any): any;
    protected _startPending(): void;
    protected _stopPending(): void;
    private _addEventListener;
    on(eventName: EventType, listener: Listener): Provider;
    once(eventName: EventType, listener: Listener): Provider;
    addEventListener(eventName: EventType, listener: Listener): Provider;
    emit(eventName: EventType, ...args: Array<any>): boolean;
    listenerCount(eventName?: EventType): number;
    listeners(eventName: EventType): Array<Listener>;
    removeAllListeners(eventName?: EventType): Provider;
    removeListener(eventName: EventType, listener: Listener): Provider;
    private _doPoll;
    resetEventsBlock(blockNumber: number): void;
    get network(): Network;
    getNetwork(): Promise<Network>;
    get blockNumber(): number;
    get polling(): boolean;
    set polling(value: boolean);
    get pollingInterval(): number;
    set pollingInterval(value: number);
    _getFastBlockNumber(): Promise<number>;
    _setFastBlockNumber(blockNumber: number): void;
    waitForTransaction(transactionHash: string, confirmations?: number): Promise<TransactionReceipt>;
}
