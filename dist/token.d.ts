import { Provider, TokenAccountState } from './providers/abstract-provider';
import { Signer } from './abstract-signer';
import { TransactionReceipt, TransactionResponse, BlockTag, TokenState } from './providers/abstract-provider';
import { BigNumberish, BigNumber } from './utils';
export declare enum FungibleTokenActions {
    transfer = "transfer",
    mint = "mint",
    burn = "burn",
    freeze = "freeze",
    unfreeze = "unfreeze",
    transferOwnership = "transferOwnership",
    acceptOwnership = "acceptOwnership"
}
export interface FungibleTokenProperties {
    name: string;
    symbol: string;
    decimals: number;
    fixedSupply: boolean;
    maxSupply: BigNumber;
    fee: {
        to: string;
        value: BigNumber;
    };
    metadata?: string;
    owner?: string;
}
export interface FungibleTokenFee {
    action: string;
    feeName: string;
}
export interface FungibleTokenStatus {
    token: {
        from: string;
        nonce: BigNumber;
        status: string;
        symbol: string;
        tokenFees?: FungibleTokenFee[];
        burnable?: boolean;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface FungibleTokenStatusTransaction {
    payload: FungibleTokenStatus;
    signatures: TokenSignature[];
}
export interface FungibleTokenAccountStatus {
    tokenAccount: {
        from: string;
        to: string;
        nonce: BigNumber;
        status: string;
        symbol: string;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface FungibleTokenAccountStatusTransaction {
    payload: FungibleTokenAccountStatus;
    signatures: TokenSignature[];
}
export interface TokenSignature {
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export declare class FungibleToken {
    readonly signer: Signer;
    readonly provider: Provider;
    readonly symbol: string;
    private _state;
    private _accountState;
    constructor(symbol: string, signerOrProvider: Signer | Provider);
    readonly state: TokenState;
    readonly accountState: TokenAccountState;
    refresh(overrides?: any): Promise<FungibleToken>;
    /**
     * Query token state
     * @param blockTag reserved for future
     * @param overrides options
     */
    getState(blockTag?: BlockTag, overrides?: any): Promise<TokenState>;
    /**
     * Query token account
     * @param blockTag reserved for future
     * @param overrides options
     */
    getAccountState(blockTag?: BlockTag, overrides?: any): Promise<TokenAccountState>;
    /**
     * Query token balance
     * @param blockTag reserved for future
     * @param overrides options
     */
    getBalance(blockTag?: BlockTag, overrides?: any): Promise<BigNumber>;
    /**
     * Transfer token by wallet
     * @param toAddressOrName receiver address
     * @param value number of token to transfer
     * @param overrides options
     */
    transfer(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Mint token by owner
     * @param toAddressOrName receiver address
     * @param value number of token to mint
     * @param overrides options
     */
    mint(toAddressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Burn token by wallet
     * @param value number of token to burn
     * @param overrides options
     */
    burn(value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Freeze wallet token by owner
     * @param addressOrName target address
     * @param overrides options
     */
    freeze(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Unfreeze wallet token by owner
     * @param addressOrName target address
     * @param overrides options
     */
    unfreeze(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Transfer token ownership
     * @param addressOrName new owner address
     * @param overrides options
     */
    transferOwnership(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Accept ownership by new owner
     * @param overrides options
     */
    acceptOwnership(overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Load token instance by symbol
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol: string, signerOrProvider: Signer | Provider, overrides?: any): Promise<FungibleToken>;
    /**
     * Create fungible token
     * @param properties token properties
     * @param signer signer wallet
     * @param overrides options
     */
    static create(properties: FungibleTokenProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | FungibleToken>;
    /**
     * Sign fungible token status transaction by issuer
     * @param transaction fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signFungibleTokenStatusTransaction(transaction: FungibleTokenStatusTransaction, signer: Signer, overrides?: any): Promise<FungibleTokenStatusTransaction>;
    /**
     * Sign fungible token account status transaction by issuer
     * @param transaction fungible token account status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signFungibleTokenAccountStatusTransaction(transaction: FungibleTokenAccountStatusTransaction, signer: Signer, overrides?: any): Promise<FungibleTokenAccountStatusTransaction>;
    /**
     * Send fungible token status transaction by middleware
     * @param transaction fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendFungibleTokenStatusTransaction(transaction: FungibleTokenStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionReceipt>;
    /**
     * Send fungible token account status transaction by middleware
     * @param transaction fungible token account status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendFungibleTokenAccountStatusTransaction(transaction: FungibleTokenAccountStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionReceipt>;
    /**
     * Approve fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<FungibleTokenStatusTransaction>;
    /**
     * Reject fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<FungibleTokenStatusTransaction>;
    /**
     * Freeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<FungibleTokenStatusTransaction>;
    /**
     * Unfreeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<FungibleTokenStatusTransaction>;
    /**
     * Freeze fungible token account by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeFungibleTokenAccount(symbol: string, to: string, signer: Signer, overrides?: any): Promise<FungibleTokenAccountStatusTransaction>;
    /**
     * Unfreeze fungible token by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeFungibleTokenAccount(symbol: string, to: string, signer: Signer, overrides?: any): Promise<FungibleTokenAccountStatusTransaction>;
}
