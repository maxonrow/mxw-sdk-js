export declare function defineReadOnly(object: any, name: string, value: any): void;
export declare function setType(object: any, type: string): void;
export declare function isType(object: any, type: string): boolean;
export declare function changeKey(object: any, name: string, newName: string): void;
export declare function camelize(object: any, rename?: (key: string, depth: number, object: any) => string, depth?: number): any;
export declare function resolveProperties(object: any): Promise<any>;
export declare function checkProperties(object: any, properties: {
    [name: string]: boolean;
}, mandate?: boolean): void;
export declare function shallowCopy(object: any): any;
export declare function deepCopy(object: any, frozen?: boolean): any;
export declare function inheritable(parent: any): (child: any) => void;
