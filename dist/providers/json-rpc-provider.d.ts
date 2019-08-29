import { BaseProvider } from './base-provider';
import { Networkish } from '../utils/networks';
import { ConnectionInfo } from '../utils/web';
export declare class JsonRpcProvider extends BaseProvider {
    readonly connection: ConnectionInfo;
    constructor(url?: ConnectionInfo | string, network?: Networkish);
    send(method: string, params: any): Promise<any>;
    perform(method: string, params: any): Promise<any>;
    private checkResponseLog;
}
