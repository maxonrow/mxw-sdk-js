'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, MultiSig, errors } from '../src.ts/index';
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



let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

describe('Suite: MultiSignature Wallet', function () {
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

        if (!silent) console.log(indent, "Fee collector:", JSON.stringify({ address: nodeProvider.fungibleToken.feeCollector }));
    });
});


describe('Suite: MultiSig - Create ', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {

        let signers = [provider.address, issuer.address, middleware.address];

        multiSigWalletProperties = {
            owner: provider.address,
            threshold: 2,
            signers: signers,
        };

        return MultiSig.MultiSigWallet.create(multiSigWalletProperties, provider, defaultOverrides).then((multiSigWallet) => {
            expect(multiSigWallet).to.exist;
            console.log(multiSigWallet)
            //let providerMultiSigWallet = multiSigWallet as MultiSig.MultiSigWallet;
        });
    });

    it("Create - checkDuplication", function () {
        return MultiSig.MultiSigWallet.create(multiSigWalletProperties, provider).then((multisigWallet) => {
            expect(multisigWallet).is.not.exist;
        }).catch(error => {
            expect(error.code).to.equal(errors.EXISTS);
        });
    });

    // it("Query", function () {
    //     return refresh(fungibleTokenProperties.symbol).then(() => {
    //         expect(fungibleToken).to.exist;
    //         if (!silent) console.log(indent, "Created Token:", JSON.stringify(fungibleToken.state));
    //     });
    // });

});