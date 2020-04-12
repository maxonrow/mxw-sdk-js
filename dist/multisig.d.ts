import { Provider, TransactionRequest, TransactionResponse, TransactionReceipt, BlockTag, AccountState, MultiSigPendingTx } from './providers/abstract-provider';
import { Signer } from './abstract-signer';
import { BigNumberish, Arrayish, BigNumber } from './utils';
export interface MultiSigWalletProperties {
    threshold: number;
    signers: string[];
}
export interface UpdateMultiSigWalletProperties {
    owner: string;
    groupAddress: string;
    threshold: number;
    signers: any;
}
export declare class MultiSigWallet extends Signer {
    readonly provider: Provider;
    readonly signer: Signer;
    private groupAddress;
    private _multisigAccountState;
    private accountNumber;
    constructor(groupAddress: string, signerOrProvider: Signer | Provider);
    get multisigAccountState(): AccountState;
    get address(): string;
    get hexAddress(): string;
    get isUsable(): boolean;
    getAddress(): Promise<string>;
    getHexAddress(): Promise<string>;
    getPublicKeyType(): never;
    getCompressedPublicKey(): never;
    sign(transaction: TransactionRequest, overrides?: any): never;
    signMessage(message: Arrayish | string, excludeRecoveryParam?: boolean): never;
    sendTransaction(transaction: TransactionRequest, overrides?: any): never;
    createTransaction(transaction: TransactionRequest, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    getCreateTransactionRequest(transaction: TransactionRequest, overrides?: any): Promise<TransactionRequest>;
    confirmTransaction(transactionId: BigNumberish, overrides?: any): Promise<TransactionReceipt>;
    getConfirmTransactionRequest(transactionId: BigNumberish, overrides?: any): Promise<TransactionRequest>;
    private getPendingTransactionRequest;
    private signInternalTransaction;
    private sendRawTransaction;
    /**
    * Create multisig wallet
    * @param properties multisig properties
    * @param signer signer wallet (owner of the group account)
    * @param overrides options
    */
    static create(properties: MultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | MultiSigWallet>;
    static getCreateTransactionRequest(properties: MultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionRequest>;
    static update(properties: UpdateMultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    static getUpdateTransactionRequest(properties: UpdateMultiSigWalletProperties, signer: Signer, overrides?: any): Promise<TransactionRequest>;
    /**
     * Load MultiSigWallet instance by address
     * @param symbol token symbol
     * @param signerOrProvider wallet object
     * @param overrides options
     */
    static fromGroupAddress(groupAddress: string, signerOrProvider: Signer | Provider, overrides?: any): Promise<MultiSigWallet>;
    /**
     * Query token account
     * @param blockTag reserved for future
     * @param overrides options
     */
    getPendingTx(txID: string, blockTag?: BlockTag, overrides?: any): Promise<MultiSigPendingTx>;
    refresh(overrides?: any): Promise<this>;
    getState(blockTag?: BlockTag, overrides?: any): Promise<AccountState>;
    getBalance(blockTag?: BlockTag): Promise<BigNumber>;
    getAccountNumber(blockTag?: BlockTag): Promise<BigNumber>;
    transfer(addressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    getTransferTransactionRequest(addressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionRequest>;
    getNonce(): BigNumber;
    clearNonce(): void;
}
