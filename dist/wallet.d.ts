import { BigNumber, BigNumberish } from './utils/bignumber';
import { HDNode } from './utils/hdnode';
import { SigningKey } from './utils/signing-key';
import { Wordlist } from './utils/wordlist';
import { Signer as AbstractSigner } from './abstract-signer';
import { Provider } from './providers/abstract-provider';
import { ProgressCallback } from './utils/secret-storage';
import { Arrayish } from './utils/bytes';
import { BlockTag, TransactionRequest, TransactionResponse, TransactionReceipt } from './providers/abstract-provider';
export declare class Wallet extends AbstractSigner {
    readonly provider: Provider;
    private readonly signingKey;
    private accountNumber;
    constructor(privateKey: SigningKey | HDNode | Arrayish, provider?: Provider);
    get address(): string;
    get hexAddress(): string;
    get mnemonic(): string;
    get wordlist(): Wordlist;
    get path(): string;
    get privateKey(): string;
    get publicKey(): string;
    get publicKeyType(): string;
    get compressedPublicKey(): string;
    get extendedPublicKey(): string;
    computeSharedSecret(otherPublicKey: string): string;
    /**
     *  Create a new instance of this Wallet connected to provider.
     */
    connect(provider: Provider): Wallet;
    getAddress(): Promise<string>;
    getAlias(): Promise<string>;
    getPendingAlias(): Promise<import("./providers/abstract-provider").AliasState>;
    getAliasState(): Promise<import("./providers/abstract-provider").AliasState>;
    getHexAddress(): Promise<string>;
    getPublicKeyType(): Promise<string>;
    getCompressedPublicKey(): Promise<string>;
    clearNonce(): void;
    sendTransaction(transaction: TransactionRequest, overrides?: any): Promise<TransactionResponse>;
    sign(transaction: TransactionRequest, overrides?: any): Promise<string>;
    signMessage(message: Arrayish | string, excludeRecoveryParam?: boolean): Promise<string>;
    getBalance(blockTag?: BlockTag): Promise<BigNumber>;
    getAccountNumber(blockTag?: BlockTag): Promise<BigNumber>;
    getTransactionCount(blockTag?: BlockTag): Promise<BigNumber>;
    transfer(addressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    isWhitelisted(blockTag?: BlockTag): Promise<Boolean>;
    getKycAddress(blockTag?: BlockTag): Promise<string>;
    createAlias(name: string | Promise<string>, appFee: {
        to: string;
        value: BigNumberish;
    }, overrides?: any): Promise<TransactionResponse | TransactionReceipt>;
    encrypt(password: Arrayish | string, options?: any, progressCallback?: ProgressCallback): Promise<string>;
    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options?: any): Wallet;
    static fromEncryptedJson(json: string, password: Arrayish, progressCallback?: ProgressCallback): Promise<Wallet>;
    static fromMnemonic(mnemonic: string, path?: string, wordlist?: Wordlist): Wallet;
}
