'use strict';

/**
 * PLEASE GET THOSE AUTHORITY WALLETS FROM VAULTS
 */

interface Node {
    connection: {
        url: string,
        timeout: number
    },
    trace: {
        silent: boolean,
        silentRpc: boolean
    },
    chainId: string,
    name: string,
    airDrop: string,
    kyc: {
        provider: string,
        issuer: string,
        middleware: string
    },
    alias: {
        provider: string,
        issuer: string,
        middleware: string,
        feeCollector: string
    },
    fungibleToken: {
        provider: string,
        issuer: string,
        middleware: string,
        feeCollector: string
    },
    nonFungibleToken: {
        provider: string,
        issuer: string,
        middleware: string,
        feeCollector: string,
        itemReceiver: string
    }
};

const localnet: Node = {
    connection: {
        url: "https://127.0.0.1:26657",
        timeout: 60000
    },
    trace: {
        silent: true,
        silentRpc: true
    },
    chainId: "localnet",
    name: "mxw",
    airDrop: "",
    kyc: {
        provider: "",
        issuer: "",
        middleware: ""
    },
    alias: {
        provider: "",
        issuer: "",
        middleware: "",
        feeCollector: ""
    },
    fungibleToken: {
        provider: "",
        issuer: "",
        middleware: "",
        feeCollector: ""
    },
    nonFungibleToken: {
        provider: "",
        issuer: "",
        middleware: "",
        feeCollector: "",
        itemReceiver: ""
    }
};

const testnet: Node = {
    connection: {
        url: "https://testnet.maxonrow.com",
        timeout: 60000
    },
    trace: {
        silent: true,
        silentRpc: true
    },
    chainId: "testnet",
    name: "mxw",
    airDrop: "",
    kyc: {
        provider: "",
        issuer: "",
        middleware: ""
    },
    alias: {
        provider: "",
        issuer: "",
        middleware: "",
        feeCollector: ""
    },
    fungibleToken: {
        provider: "",
        issuer: "",
        middleware: "",
        feeCollector: ""
    },
    nonFungibleToken: {
        provider: "",
        issuer: "",
        middleware: "",
        feeCollector: "",
        itemReceiver: ""
    }
};

const nodes: { [name: string]: Node } = { localnet, testnet };

// const nodeProvider: Node = localnet;
const nodeProvider: Node = testnet;

export {
    nodeProvider, nodes, localnet, testnet,
    Node
};
