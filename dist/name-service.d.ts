import { Signer } from './abstract-signer';
import { BigNumber } from './utils';
import { TransactionResponse, TransactionReceipt, TransactionRequest } from './providers';
export interface AliasStatus {
    alias: {
        name: string;
        from: string;
        nonce: BigNumber;
        status: string;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface AliasStatusTransaction {
    payload: AliasStatus;
    signatures: AliasSignature[];
}
export interface AliasSignature {
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export declare class Alias {
    /**
     * Sign alias status transaction by issuer
     * @param transaction alias status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signAliasStatusTransaction(transaction: AliasStatusTransaction, signer: Signer, overrides?: any): Promise<AliasStatusTransaction>;
    /**
     * Send alias status transaction by middleware
     * @param transaction alias status transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendAliasStatusTransaction(transaction: AliasStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    static getAliasStatusTransactionRequest(transaction: AliasStatusTransaction, signer: Signer, overrides?: any): Promise<TransactionRequest>;
    /**
     * Approve alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static approveAlias(name: string, signer: Signer, overrides?: any): Promise<AliasStatusTransaction>;
    /**
     * Reject alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static rejectAlias(name: string, signer: Signer, overrides?: any): Promise<AliasStatusTransaction>;
    /**
     * Revoke alias by provider
     * @param name alias name
     * @param signer signer wallet
     * @param overrides options
     */
    static revokeAlias(name: string, signer: Signer, overrides?: any): Promise<AliasStatusTransaction>;
}
