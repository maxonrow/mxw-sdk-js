
import { isType, setType } from './utils/properties';

// Imported Abstracts
import { Provider } from './providers/abstract-provider';

// Imported Types
import { Arrayish } from './utils/bytes';
import { TransactionRequest, TransactionResponse } from './providers/abstract-provider';
import { BigNumber } from './utils';

export abstract class Signer {
    readonly provider?: Provider;

    protected nonce: BigNumber;

    abstract getAddress(): Promise<string>
    abstract getHexAddress(): Promise<string>

    abstract getPublicKeyType(): Promise<string>
    abstract getCompressedPublicKey(): Promise<string>

    abstract signMessage(message: Arrayish | string, excludeRecoveryParam?: boolean): Promise<string>;
    abstract sign(transaction: TransactionRequest, overrides?: any): Promise<string>;
    abstract sendTransaction(transaction: TransactionRequest, overrides?: any): Promise<TransactionResponse>;

    abstract clearNonce(): void;

    constructor() {
        setType(this, 'Signer');
    }

    static isSigner(value: any): value is Signer {
        return isType(value, 'Signer');
    }

    //    readonly inherits: (child: any) => void;
}

//defineReadOnly(Signer, 'inherits', inheritable(Signer));

