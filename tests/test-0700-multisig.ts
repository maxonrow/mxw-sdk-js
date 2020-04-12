'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, MultiSig } from '../src.ts/index';
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

let multiSigWalletProperties: MultiSig.MultiSigWalletProperties;
let updateMultiSigWalletProperties: MultiSig.UpdateMultiSigWalletProperties;

let multiSigWallet: MultiSig.MultiSigWallet;

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

describe('Suite: MultiSig Wallet', function () {
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

        provider = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.provider).connect(providerConnection);
        expect(provider).to.exist;
        if (!silent) console.log(indent, "Provider:", JSON.stringify({ address: provider.address, mnemonic: provider.mnemonic }));

        issuer = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.issuer).connect(providerConnection);
        expect(issuer).to.exist;
        if (!silent) console.log(indent, "Issuer:", JSON.stringify({ address: issuer.address, mnemonic: issuer.mnemonic }));

        middleware = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.middleware).connect(providerConnection);
        expect(middleware).to.exist;
        if (!silent) console.log(indent, "Middleware:", JSON.stringify({ address: middleware.address, mnemonic: middleware.mnemonic }));
    });

    it("Create", function () {
        this.slow(slowThreshold); // define the threshold for slow indicator
        let signers = [wallet.address, issuer.address, middleware.address];

        multiSigWalletProperties = {
            threshold: 2,
            signers: signers,
        };

        return MultiSig.MultiSigWallet.create(multiSigWalletProperties, wallet, defaultOverrides).then((instance) => {
            expect(instance).to.exist;
            multiSigWallet = instance as MultiSig.MultiSigWallet;
            if (!silent) console.log(indent, "Created multiSigWallet:", multiSigWallet.address);
        });
    });

    it("Load from group address", function () {
        return MultiSig.MultiSigWallet.fromGroupAddress(multiSigWallet.address, wallet).then((instance) => {
            expect(instance).to.exist;
            multiSigWallet = instance;
            if (!silent) console.log(indent, "Loaded multiSigWallet:", JSON.stringify(multiSigWallet.multisigAccountState));
        });
    });

    it("Update account", function () {
        let signers = [wallet.address, issuer.address, middleware.address];
        updateMultiSigWalletProperties = {
            owner: wallet.address,
            groupAddress: multiSigWallet.address,
            threshold: signers.length,
            signers: signers,
        };
        return MultiSig.MultiSigWallet.update(updateMultiSigWalletProperties, wallet).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "update.receipt:", JSON.stringify(receipt));
        });
    });

    it("Receive balance", function () {
        let value = mxw.utils.parseMxw("10");
        let overrides = {
            memo: "Hello MultiSig!"
        };
        return wallet.transfer(multiSigWallet.address, value, overrides).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
        }).then(() => {
            return multiSigWallet.getBalance().then((balance) => {
                expect(balance.toString()).to.eq(value.toString());
                if (!silent) console.log(indent, "Received balance:", balance);
            })
        });
    });

    it("Transfer balance", function () {
        return multiSigWallet.transfer(wallet.address, mxw.utils.parseMxw("1")).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
        }).then(() => {

        });
    });

    it("Clean up", function () {
        providerConnection.removeAllListeners();
    });

});
