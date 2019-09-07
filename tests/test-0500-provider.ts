'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, errors } from '../src.ts/index';
import { nodeProvider } from "./env";

let indent = "     ";
let silent = true;
let silentRpc = true;
let slowThreshold = 9000;

let provider: mxw.providers.Provider;

describe('Suite: Provider', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    if (silent) { silent = nodeProvider.trace.silent; }
    if (silentRpc) { silentRpc = nodeProvider.trace.silentRpc; }
    
    provider = new mxw.providers.JsonRpcProvider(nodeProvider.connection, nodeProvider).on("rpc", function (args) {
        if (!silentRpc) {
            if ("response" == args.action) {
                console.log(indent, "RPC REQ:", JSON.stringify(args.request));
                console.log(indent, "    RES:", JSON.stringify(args.response));
            }
        }
    });

    it("Get account state", function () {
        return provider.getAccountState("mxw1mklypleqjhemrlt6z625rzqa0jl6namdmmqnx4", null).then((state) => {
            if (!silent) console.log(indent, "Account state:", JSON.stringify(state));
        });
    });

    it("Get balance", function () {
        return provider.getBalance("mxw1mklypleqjhemrlt6z625rzqa0jl6namdmmqnx4", null).then((balance) => {
            expect(balance).to.exist;
            if (!silent) console.log(indent, "Balance:", balance.toString());
        });
    });

    it("Get block number", function () {
        return provider.getBlockNumber().then((blockNumber) => {
            expect(blockNumber).to.exist;
            if (!silent) console.log(indent, "Block number:", blockNumber);
        });
    });

    it("Get block details", function () {
        return provider.getBlock("1").then((block) => {
            expect(block).to.exist;
            if (!silent) console.log(indent, "Block:", JSON.stringify(block, null, 2));

            let index = 0;
            for (let transaction of block.results.transactions) {
                if (!silent) console.log(indent, "Transaction hash", index + ":", transaction.hash);
                for (let event of transaction.events) {
                    if (!silent) console.log(indent, "Transaction", index + " creator:", event.address + ", event", event.hash, JSON.stringify(event.params));
                }
                index++;
            }
        });
    });

    it("Get transaction", function () {
        return provider.getTransaction("0x249dcf0fdb6937e85bbdd729609fbc01751592e96c4ab46de764538e12fd9ae9").then((transaction) => {
            if (!silent) console.log(indent, "transaction:", JSON.stringify(transaction, null, 2));
        });
    });

    it("Get transaction receipt", function () {
        return provider.getTransactionReceipt("0x249dcf0fdb6937e85bbdd729609fbc01751592e96c4ab46de764538e12fd9ae9").then((receipt) => {
            if (!silent) console.log(indent, "transactionReceipt:", JSON.stringify(receipt, null, 2));
        });
    });

    it("Get status", function () {
        return provider.getStatus().then((status) => {
            expect(status).to.exist;
            if (!silent) console.log(indent, "Status:", status);
        });
    });

    it("Resolve name", function () {
        let name = "7d6eafb2";
        return provider.resolveName(name).then((address) => {
            if (!silent) console.log(indent, "Resolve name:", name, "=>", address ? address : "<EMPTY>");
        }).catch(error => {
            if (error.code != errors.INVALID_ADDRESS) {
                throw error;
            }
            if (!silent) console.log(indent, "Resolve name:", name, "=> <EMPTY>");
        });
    });

    it("Lookup address", function () {
        let address = "mxw1aef2hwa64ffea5vmn9uqz55j8gvjkta99fpkch";
        return provider.lookupAddress(address).then((name) => {
            if (!silent) console.log(indent, "Lookup Address:", address, "=>", name ? name : "<EMPTY>");
        });
    });

    it("Get account number with non-exists address", function () {
        return provider.getAccountNumber("mxw18nyjc5sxz0tlndf8uslyj6k9leha59vc23djl6").then((accountNumber) => {
            expect(accountNumber).to.exist;
            expect(accountNumber.toString()).to.equal("0");
            if (!silent) console.log(indent, "AccountNumber:", accountNumber.toString());
        });
    });

    it("Check KYC whitelist status", function () {
        let address = "mxw1wv3kquk24x8lh06905z98r9wydzu6e55lfdeae";
        return provider.isWhitelisted(address).then((whitelisted) => {
            if (!silent) console.log(indent, "isWhitelisted", address + ":", whitelisted ? "YES" : "NO");
        });
    });

    it("Check KYC address", function () {
        let address = "mxw1wv3kquk24x8lh06905z98r9wydzu6e55lfdeae";
        return provider.getKycAddress(address).then((kycAddress) => {
            if (!silent) console.log(indent, "KYC address:", kycAddress);
        });
    });

    it("Get transaction fee", function () {
        return provider.getTransactionFee("bank", "bank-send", {
            from: "mxw1qj75krmwsug5le85quhxjmy4pjj2uh9mmyaqdv",
            to: "mxw1qj75krmwsug5le85quhxjmy4pjj2uh9mmyaqdv",
            value: "1000000000",
            memo: "Hello Blockchain!"
        }).then((fee) => {
            expect(fee).to.exist;
            if (!silent) console.log(indent, "transactionFee:", fee ? JSON.stringify(fee) : "<EMPTY>");
        });
    });

    it("Get transaction fee setting", function () {
        return provider.getTransactionFeeSetting("bank-send").then((setting) => {
            expect(setting).to.exist;
            if (!silent) console.log(indent, "transactionFeeSetting:", JSON.stringify(setting));
        });
    });

    it("Get alias application", function () {
        return provider.getAliasState("mxw1y5vnkav6aara3a6srruu3u5v7rhke9n7unxhda").then((state) => {
            if (!silent) console.log(indent, "Alias state:", state ? JSON.stringify(state) : "<EMPTY>");
        });
    });

    it("Clean up", function () {
        provider.removeAllListeners("rpc");
    });
});
