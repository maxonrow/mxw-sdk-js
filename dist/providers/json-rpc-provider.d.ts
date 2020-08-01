import { BaseProvider } from './base-provider';
import { Networkish } from '../utils/networks';
import { ConnectionInfo } from '../utils/web';
export declare class JsonRpcProvider extends BaseProvider {
    readonly connection: ConnectionInfo;
    constructor(url?: ConnectionInfo | string, network?: Networkish);
    get pollingInterval(): number;
    set pollingInterval(value: number);
    send(method: string, params: any): Promise<any>;
    perform(method: string, params: any): Promise<any>;
    checkResponseLog(method: string, result: any, code?: string, message?: string, params?: any): any;
}
