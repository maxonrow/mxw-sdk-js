import { Provider, TransactionRequest } from './providers/abstract-provider';
import { Signer } from './abstract-signer';
import { TransactionReceipt, TransactionResponse, BlockTag, NFTokenItemState } from './providers/abstract-provider';
import { NonFungibleToken } from './non-fungible-token';
export declare class NonFungibleTokenItem {
    readonly signer: Signer;
    readonly provider: Provider;
    readonly symbol: string;
    readonly itemID: string;
    private _state;
    private _NFT;
    constructor(symbol: string, itemID: string, signerOrProvider: Signer | Provider);
    get state(): NFTokenItemState;
    get parent(): NonFungibleToken;
    refresh(overrides?: any): Promise<this>;
    /**
    * Query token item state
    * @param itemID itemID
    * @param blockTag reserved for future
    *
    */
    getState(blockTag?: BlockTag, overrides?: any): Promise<NFTokenItemState>;
    private getParent;
    /**
     * Load token item instance by symbol and itemID
     * @param symbol token symbol
     * @param itemID token item id
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromSymbol(symbol: string, itemID: string, signerOrProvider: Signer | Provider, overrides?: any): Promise<NonFungibleTokenItem>;
    /**
     * Transfer token item by wallet
     * @param toAddressOrName receiver address
     * @param overrides options
     */
    transfer(toAddressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    getTransferTransactionRequest(toAddressOrName: string | Promise<string>, overrides?: any): Promise<TransactionRequest>;
    /**
    * Endorse token item by endorser
    */
    endorse(metadata?: string, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    getEndorseTransactionRequest(metadata: string, overrides?: any): Promise<TransactionRequest>;
    /**
    * Update token item metadata
    * @param metadata metadata to update
    * @param overrides options
    */
    updateMetadata(metadata?: string, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    getUpdateMetadataTransactionRequest(metadata?: string, overrides?: any): Promise<TransactionRequest>;
    /**
     * Burn non-fungible token item
     * @param overrides options
     */
    burn(overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    getBurnTransactionRequest(overrides?: any): Promise<TransactionRequest>;
}
