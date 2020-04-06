'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, MultiSig } from '../src.ts/index';
import { nodeProvider } from "./env";
import { bigNumberify } from '../src.ts/utils';
import { smallestUnitName } from '../src.ts/utils/units';

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
        let signers = [wallet.address, issuer.address, middleware.address];

        multiSigWalletProperties = {
            owner: wallet.address,
            threshold: 2,
            signers: signers,
        };

        return MultiSig.MultiSigWallet.create(multiSigWalletProperties, wallet, defaultOverrides).then((multiSigWalletRes) => {
            expect(multiSigWalletRes).to.exist;
            console.log(multiSigWalletRes);
            multiSigWallet = multiSigWalletRes as MultiSig.MultiSigWallet;
        });
    });

    it("Query", function () {
        return MultiSig.MultiSigWallet.fromGroupAddress(multiSigWallet.groupAddress, wallet).then((res) => {
            console.log(indent, "Created MultiSigWallet:", JSON.stringify(res.multisigAccountState));
            multiSigWallet = res
        });
    });

    it("Multisig account Update", function () {

        let signers = [wallet.address, issuer.address, middleware.address];
        updateMultiSigWalletProperties = {
            owner: wallet.address,
            groupAddress: multiSigWallet.groupAddress.toString(),
            threshold: bigNumberify(3),
            signers: signers,
        };
        return MultiSig.MultiSigWallet.update(updateMultiSigWalletProperties, wallet).then((txReceipt) => {
            expect(txReceipt).to.exist;
        });

    });


    it("Transfer to group account", function () {
        let value = mxw.utils.parseMxw("100");
        let overrides = {
            logSignaturePayload: defaultOverrides.logSignaturePayload,
            logSignedTransaction: defaultOverrides.logSignedTransaction,
            memo: "Hello Blockchain!"
        }
        return wallet.provider.getTransactionFee("bank", "bank-send", {
            from: wallet.address,
            to: multiSigWallet.groupAddress,
            value,
            memo: overrides.memo
        }).then((fee) => {
            overrides["fee"] = fee;
            return wallet.transfer(multiSigWallet.groupAddress, value, overrides).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
            });
        });
    });

    it("Multisig create Transfer", function () {
        let transaction = providerConnection.getTransactionRequest("bank", "bank-send", {
            from: multiSigWallet.groupAddress,
            to: wallet.address,
            value: mxw.utils.parseMxw("1"),
            memo: "pipipapipu",
            denom: smallestUnitName
        });
        return providerConnection.getTransactionFee(undefined, undefined, { tx: transaction }).then((fee) => {
            transaction["fee"] = fee;
            return multiSigWallet.sendTransaction(transaction).then((txReceipt) => {
                expect(txReceipt).to.exist;
                let anotherSigner = new MultiSig.MultiSigWallet(multiSigWallet.groupAddress, issuer)
                anotherSigner.refresh();
                return anotherSigner.sendConfirmTransaction(0).then((respond) => {
                    expect(respond).to.exist;
                });
            });
        });
    });


});