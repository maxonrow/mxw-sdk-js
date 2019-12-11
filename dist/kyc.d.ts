import { Provider } from './providers/abstract-provider';
import { Signer } from './abstract-signer';
import { TransactionReceipt, TransactionResponse } from './providers/abstract-provider';
import { BigNumber } from './utils';
export interface KycKeyComponent {
    country: string;
    idType: string;
    id: string;
    idExpiry: number;
    dob: number;
    seed: string;
}
export interface KycData {
    kyc: {
        from: string;
        nonce: BigNumber;
        kycAddress: string;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface KycTransaction {
    payload: KycData;
    signatures: KycSignature[];
}
export interface KycSignature {
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface KycRevoke {
    kyc: {
        from: string;
        to: string;
        nonce: BigNumber;
    };
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}
export interface KycRevokeTransaction {
    payload: KycRevoke;
    signatures: KycSignature[];
}
export declare class Kyc {
    readonly signer: Signer;
    readonly provider: Provider;
    constructor(signerOrProvider: Signer | Provider);
    approve(transaction?: KycTransaction, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Middleware to whitelist wallet (DEPRECIATE SOON)
     * @param transaction transaction object
     * @param overrides options
     */
    whitelist(transaction?: KycTransaction, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Generate kyc address by hashing the key components
     * @param keyComponent key component to form the kyc address
     * @param issuerAddress issuer address
     * @returns kyc address
     */
    getKycAddress(keyComponent: KycKeyComponent): string;
    /**
     * Wallet to sign kyc address
     * @param keyComponentOrAddress key components to form kyc address or formed kyc address
     * @param overrides options
     * @todo issuerAddress parameter will going to mandate in next release
     */
    sign(keyComponentOrAddress: KycKeyComponent | string, overrides?: any): Promise<KycData>;
    /**
     * Issuer to sign transaction
     * @param transaction transaction object
     * @param overrides options
     */
    signTransaction(transaction: KycTransaction, overrides?: any): Promise<KycTransaction>;
    /**
     *  Static methods to create kyc instances.
     */
    static create(signerOrProvider?: Signer | Provider): Promise<Kyc>;
    /**
     * Revoke kyc whitelist by provider
     * @param address wallet address
     * @param signer signer wallet
     * @param overrides options
     */
    static revoke(address: string, signer: Signer, overrides?: any): Promise<KycRevokeTransaction>;
    /**
     * Sign revocation transaction by issuer
     * @param transaction revocation transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static signRevokeTransaction(transaction: KycRevokeTransaction, signer: Signer, overrides?: any): Promise<KycRevokeTransaction>;
    /**
     * Send revocation transaction by middleware
     * @param transaction revocation transaction
     * @param signer signer wallet
     * @param overrides options
     */
    static sendRevokeTransaction(transaction: KycRevokeTransaction, signer: Signer, overrides?: any): Promise<TransactionReceipt>;
    /**
     * Create relationship between wallets
     * @param transaction transaction object
     * @param overrides options
     */
    static bind(to: string, kycAddress: string, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    /**
     * Remove relationship between wallets
     * @param transaction transaction object
     * @param overrides options
     */
    static unbind(to: string, kycAddress: string, signer: Signer, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
}
