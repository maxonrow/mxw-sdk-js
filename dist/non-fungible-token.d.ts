import { Provider } from './providers/abstract-provider';
import { Signer } from './abstract-signer';
import { TransactionReceipt, TransactionResponse, BlockTag, NFTokenState } from './providers/abstract-provider';
import { BigNumber } from './utils';
export declare enum NonFungibleTokenActions {
    transfer = "transfer",
    mint = "mint",
    burn = "burn",
    transferOwnership = "transferOwnership",
    acceptOwnership = "acceptOwnership"
}
export declare enum NFTokenStateFlags {
    nonfungible = 1,
    mint = 2,
    burn = 4,
    frozen = 8,
    approved = 16,
    transferable = 32,
    modifiable = 64,
    public = 128
}
export interface NonFungibleTokenProperties {
    name: string;
    symbol: string;
    fee: {
        to: string;
        value: BigNumber;
    };
    metadata?: string[];
    properties?: string[];
    owner?: string;
}
export interface NonFungibleTokenFee {
    action: string;
    feeName: string;
}
export interface NonFungibleTokenItem {
    symbol: string;
    itemID: string;
    properties: string[];
    metadata: string[];
}
export interface NonFungibleTokenSignature {
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface NonFungibleTokenStatus {
    token: {
        endorserList?: string[];
        from: string;
        mintLimit: BigNumber;
        nonce: BigNumber;
        status: string;
        symbol: string;
        tokenFees?: NonFungibleTokenFee[];
        transferLimit: BigNumber;
        burnable: boolean;
        transferable: boolean;
        modifiable: boolean;
        pub: boolean;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface NonFungibleTokenItemStatus {
    item: {
        from: string;
        nonce: BigNumber;
        status: string;
        symbol: string;
        itemID: string;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface NonFungibleTokenStatusTransaction {
    payload: NonFungibleTokenStatus;
    signatures: NonFungibleTokenSignature[];
}
export interface NonFungibleTokenItemStatusTransaction {
    payload: NonFungibleTokenItemStatus;
    signatures: NonFungibleTokenSignature[];
}
export declare class NonFungibleToken {
    readonly signer: Signer;
    readonly provider: Provider;
    readonly symbol: string;
    private _state;
    constructor(symbol: string, signerOrProvider: Signer | Provider);
    get state(): NFTokenState;
    get isApproved(): boolean;
    get isFrozen(): boolean;
    get isUsable(): boolean;
    refresh(overrides?: any): Promise<this>;
    /**
     * Query token state
     * @param blockTag reserved for future
     * @param overrides options
     */
    getState(blockTag?: BlockTag, overrides?: any): Promise<NFTokenState>;
    /**
    * Transfer token ownership
    * @param addressOrName new owner address
    * @param overrides options
    */
    transferOwnership(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionReceipt>;
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
    static fromSymbol(symbol: string, signerOrProvider: Signer | Provider, overrides?: any): Promise<NonFungibleToken>;
    /**
     * Create non-fungible token
     * @param properties token properties
     * @param signer signer wallet
     * @param overrides options
     */
    static create(tokenProperties: NonFungibleTokenProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | NonFungibleToken>;
    /**
    * Mint NFT item
    * @param toAddressOrName receiver address
    * @param item item to mint
    * @param overrides options
    */
    mint(toAddressOrName: string | Promise<string>, item: NonFungibleTokenItem, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Sign non fungible token status transaction by issuer
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signNonFungibleTokenStatusTransaction(transaction: NonFungibleTokenStatusTransaction, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Sign non fungible token item status transaction by issuer
     * @param transaction non fungible token item status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signNonFungibleTokenItemStatusTransaction(transaction: NonFungibleTokenItemStatusTransaction, signer: Signer, overrides?: any): Promise<NonFungibleTokenItemStatusTransaction>;
    /**
     * Approve non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveNonFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Reject non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectNonFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Freeze non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static freezeNonFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Unfreeze non fungible token by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static unfreezeNonFungibleToken(symbol: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Approve non fungible token ownership by provider
     * @param symbol non fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static approveNonFungibleTokenOwnership(symbol: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Reject fungible token ownership by provider
     * @param symbol fungible token symbol
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectNonFungibleTokenOwnership(symbol: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenStatusTransaction>;
    /**
     * Send non fungible token status transaction by middleware
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendNonFungibleTokenStatusTransaction(transaction: NonFungibleTokenStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionReceipt>;
    /**
     * Send non fungible token item status transaction by middleware
     * @param transaction non fungible token status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendNonFungibleTokenItemStatusTransaction(transaction: NonFungibleTokenItemStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionReceipt>;
    /**
     * Freeze NFT item by provider
     * @param symbol token item symbol
     * @param itemID token item id
     * @param overrides options
     */
    static freezeNonFungibleTokenItem(symbol: string, itemID: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenItemStatusTransaction>;
    /**
     * Unfreeze NFT item by provider
     * @param symbol token item symbol
     * @param itemID token item id
     * @param overrides options
     */
    static unfreezeNonFungibleTokenItem(symbol: string, itemID: string, signer: Signer, overrides?: any): Promise<NonFungibleTokenItemStatusTransaction>;
}
