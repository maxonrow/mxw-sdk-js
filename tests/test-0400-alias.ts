'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, errors, nameService } from '../src.ts/index';
import { bigNumberify, hexlify, randomBytes } from '../src.ts/utils';
import { nodeProvider } from "./env";

let indent = "     ";
let silent = true;
let silentRpc = true;
let slowThreshold = 9000;

let providerConnection: mxw.providers.Provider;
let wallet: mxw.Wallet;
let provider: mxw.Wallet;
let issuer: mxw.Wallet;
let middleware: mxw.Wallet;

let name: string;

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

if ("" != nodeProvider.alias.middleware) {
    describe('Suite: Alias', async function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        if (silent) { silent = nodeProvider.trace.silent; }
        if (silentRpc) { silentRpc = nodeProvider.trace.silentRpc; }

        it("Initialize", function () {
            providerConnection = new mxw.providers.JsonRpcProvider(nodeProvider.connection, nodeProvider)
                .on("rpc", function (args) {
                    if (!silentRpc) {
                        if ("response" == args.action) {
                            console.log(indent, "RPC REQ:", JSON.stringify(args.request));
                            console.log(indent, "    RES:", JSON.stringify(args.response));
                        }
                    }
                }).on("responseLog", function (args) {
                    if (!silentRpc) {
                        console.log(indent, "RES LOG:", JSON.stringify({ info: args.info, response: args.response }));
                    }
                });

            // We need to use KYCed wallet to create fungible token
            wallet = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer).connect(providerConnection);
            expect(wallet).to.exist;
            if (!silent) console.log(indent, "Wallet:", JSON.stringify({ address: wallet.address, mnemonic: wallet.mnemonic }));

            provider = mxw.Wallet.fromMnemonic(nodeProvider.alias.provider).connect(providerConnection);
            expect(provider).to.exist;
            if (!silent) console.log(indent, "Provider:", JSON.stringify({ address: provider.address, mnemonic: provider.mnemonic }));

            issuer = mxw.Wallet.fromMnemonic(nodeProvider.alias.issuer).connect(providerConnection);
            expect(issuer).to.exist;
            if (!silent) console.log(indent, "Issuer:", JSON.stringify({ address: issuer.address, mnemonic: issuer.mnemonic }));

            middleware = mxw.Wallet.fromMnemonic(nodeProvider.alias.middleware).connect(providerConnection);
            expect(middleware).to.exist;
            if (!silent) console.log(indent, "Middleware:", JSON.stringify({ address: middleware.address, mnemonic: middleware.mnemonic }));

            if (!silent) console.log(indent, "Fee collector:", JSON.stringify({ address: nodeProvider.alias.feeCollector }));
        });
    });

    describe('Suite: Alias - Approve', function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        it("Application should not exists", function () {
            let wallet = mxw.Wallet.createRandom().connect(providerConnection);
            return wallet.getPendingAlias().then((alias) => {
                expect(alias).to.equal(null);
            });
        });

        it("Create", function () {
            let appFee = {
                to: nodeProvider.alias.feeCollector,
                value: bigNumberify("100000000")
            };
            name = hexlify(randomBytes(4)).substring(2);

            return wallet.createAlias(name, appFee, defaultOverrides).then((receipt) => {
                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });

        it("Create - checkDuplication", function () {
            let appFee = {
                to: nodeProvider.alias.feeCollector,
                value: bigNumberify("100000000")
            };
            return wallet.createAlias(name, appFee, defaultOverrides).then((receipt) => {
                expect(receipt).is.not.exist;
            }).catch(error => {
                if (errors.EXISTS != error.code && errors.NOT_ALLOWED != error.code) {
                    throw error;
                }
            });
        });

        it("Resolve expected no result", function () {
            return wallet.provider.resolveName(name).then((address) => {
                expect(address).is.not.exist;
            }).catch(error => {
                if (errors.INVALID_ADDRESS != error.code) {
                    throw error;
                }
            });
        });

        it("Application should exists", function () {
            return wallet.getPendingAlias().then((state) => {
                expect(state.name).to.equal(name);
            });
        });

        it("Approve", function () {
            return performAliasStatus(name, nameService.Alias.approveAlias, defaultOverrides).then((receipt) => {
                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
            });
        });

        it("Approve - checkDuplication", function () {
            return performAliasStatus(name, nameService.Alias.approveAlias, defaultOverrides).then((receipt) => {
                expect(receipt).is.not.exist;
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_FOUND);
            });
        });

        it("Resolve with alias", function () {
            return wallet.provider.resolveName(name).then((address) => {
                expect(address).to.equal(wallet.address);
                if (!silent) console.log(indent, name, "=>", address);
            });
        });

        it("Lookup address", function () {
            return wallet.provider.lookupAddress(wallet.address).then((alias) => {
                expect(alias).to.exist;
                if (!silent) console.log(indent, wallet.address, "=>", alias);
            });
        });

        it("Application should not exists", function () {
            return wallet.getPendingAlias().then((state) => {
                expect(state).to.equal(null);
            });
        });

        it("Revoke", function () {
            return performAliasStatus(name, nameService.Alias.revokeAlias, defaultOverrides).then((receipt) => {
                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
            });
        });

        it("Revoke - checkDuplication", function () {
            return performAliasStatus(name, nameService.Alias.revokeAlias, defaultOverrides).then((receipt) => {
                expect(receipt).is.not.exist;
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_FOUND);
            });
        });

        it("Resolve expected no result", function () {
            return wallet.provider.resolveName(name).then((address) => {
                expect(address).is.not.exist;
            }).catch(error => {
                if (errors.INVALID_ADDRESS != error.code) {
                    throw error;
                }
            });
        });
    });

    describe('Suite: Alias - Reject', function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        it("Application should not exists", function () {
            let wallet = mxw.Wallet.createRandom().connect(providerConnection);
            return wallet.getPendingAlias().then((alias) => {
                expect(alias).to.equal(null);
            });
        });

        it("Create", function () {
            let appFee = {
                to: nodeProvider.alias.feeCollector,
                value: bigNumberify("100000000")
            };
            name = hexlify(randomBytes(4)).substring(2);

            return wallet.createAlias(name, appFee, defaultOverrides).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Alias.create RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });

        it("Create - checkDuplication", function () {
            let appFee = {
                to: nodeProvider.alias.feeCollector,
                value: bigNumberify("100000000")
            };
            return wallet.createAlias(name, appFee, defaultOverrides).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                if (errors.EXISTS != error.code && errors.NOT_ALLOWED != error.code) {
                    throw error;
                }
            });
        });

        it("Resolve expected no result", function () {
            return wallet.provider.resolveName(name).then((address) => {
                expect(address).to.not.exist;
            }).catch(error => {
                if (errors.INVALID_ADDRESS != error.code) {
                    throw error;
                }
            });
        });

        it("Application should exists", function () {
            return wallet.getPendingAlias().then((state) => {
                expect(state.name).to.equal(name);
            });
        });

        it("Reject", function () {
            return performAliasStatus(name, nameService.Alias.rejectAlias, defaultOverrides).then((receipt) => {
                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
            });
        });

        it("Reject - checkDuplication", function () {
            return performAliasStatus(name, nameService.Alias.rejectAlias, defaultOverrides).then((receipt) => {
                expect(receipt).is.not.exist;
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_FOUND);
            });
        });

        it("Application should not exists", function () {
            return wallet.getPendingAlias().then((state) => {
                expect(state).to.equal(null);
            });
        });

        it("Resolve expected no result", function () {
            return wallet.provider.resolveName(name).then((address) => {
                expect(address).to.not.exist;
            }).catch(error => {
                if (errors.INVALID_ADDRESS != error.code) {
                    throw error;
                }
            });
        });
    });

    describe('Suite: Alias', function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        it("Clean up", function () {
            providerConnection.removeAllListeners();
        });
    });
}

function performAliasStatus(name: string, perform: any, overrides?: any) {
    return perform(name, provider, overrides).then((transaction) => {
        return nameService.Alias.signAliasStatusTransaction(transaction, issuer);
    }).then((transaction) => {
        return nameService.Alias.sendAliasStatusTransaction(transaction, middleware).then((receipt) => {
            expect(receipt.status).to.equal(1);
            return receipt;
        });
    });
}
