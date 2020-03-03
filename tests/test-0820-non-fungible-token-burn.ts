'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, nonFungibleToken as token, errors } from '../src.ts/index';
import { bigNumberify, hexlify, randomBytes } from '../src.ts/utils';
import { nodeProvider } from "./env";

import * as crypto from "crypto";
import { NonFungibleTokenActions, NonFungibleToken } from '../src.ts/non-fungible-token';
import { NonFungibleTokenItem } from '../src.ts/non-fungible-token-item';

let indent = "     ";
let silent = true;
let silentRpc = true;
let slowThreshold = 9000;

let providerConnection: mxw.providers.Provider;
let wallet: mxw.Wallet;
let provider: mxw.Wallet;
let issuer: mxw.Wallet;
let middleware: mxw.Wallet;

let nonFungibleTokenProperties: token.NonFungibleTokenProperties;
let nonFungibleToken: token.NonFungibleToken;
let issuerNonFungibleToken: token.NonFungibleToken;

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

if ("" != nodeProvider.nonFungibleToken.middleware) {
    describe('Suite: NonFungibleToken - public', function () {
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

            // We need to use KYCed wallet to create non fungible token
            wallet = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer).connect(providerConnection);
            expect(wallet).to.exist;
            if (!silent) console.log(indent, "Wallet:", JSON.stringify({ address: wallet.address, mnemonic: wallet.mnemonic }));

            provider = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.provider).connect(providerConnection);
            expect(provider).to.exist;
            if (!silent) console.log(indent, "Provider:", JSON.stringify({ address: provider.address, mnemonic: provider.mnemonic }));

            issuer = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.issuer).connect(providerConnection);
            expect(issuer).to.exist;
            if (!silent) console.log(indent, "Issuer:", JSON.stringify({ address: issuer.address, mnemonic: issuer.mnemonic }));

            middleware = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.middleware).connect(providerConnection);
            expect(middleware).to.exist;
            console.log(indent, "Middleware:", JSON.stringify({ address: middleware.address, mnemonic: middleware.mnemonic }));
            if (!silent) console.log(indent, "Middleware:", JSON.stringify({ address: middleware.address, mnemonic: middleware.mnemonic }));

            if (!silent) console.log(indent, "Fee collector:", JSON.stringify({ address: nodeProvider.nonFungibleToken.feeCollector }));

        });
    });

    [false, true].forEach((burnable) => {

        describe('Suite: NonFungibleToken - burning ' + (burnable ? "(burnable)" : "(non-burnable)"), function () {

            this.slow(slowThreshold); // define the threshold for slow indicator
            let symbol = "NFT" + hexlify(randomBytes(4)).substring(2);
            it("Create", function () {
                nonFungibleTokenProperties = {
                    name: "MY" + symbol,
                    symbol: symbol,
                    fee: {
                        to: nodeProvider.nonFungibleToken.feeCollector,
                        value: bigNumberify("1")
                    },
                    metadata: "Wallet able to manage their own metadata",
                    properties: "Decentralised identifier"
                };

                return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
                    expect(token).to.exist;
                    issuerNonFungibleToken = token as token.NonFungibleToken;
                });
            });

            it("Create - Check Duplication", function () {
                return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer).then((token) => {
                    expect(token).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.EXISTS);
                });
            });

            it("Query", function () {
                return refresh(nonFungibleTokenProperties.symbol).then(() => {
                    expect(nonFungibleToken).to.exist;
                    if (!silent) console.log(indent, "Created Token:", JSON.stringify(nonFungibleToken.state));
                });
            });

            it("Approve - challenge wrong fee setting", function () {

                let overrides = {
                    tokenFees: [
                        { action: NonFungibleTokenActions.transfer, feeName: "anything" },
                        { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
                        { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
                    endorserList: [],
                    mintLimit: 1,
                    transferLimit: 1,
                    burnable: burnable,
                    transferable: true,
                    modifiable: true,
                    pub: false

                };

                return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleToken, overrides).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.MISSING_FEES);
                });
            });

            it("Approve", function () {
                let overrides = {
                    tokenFees: [
                        { action: NonFungibleTokenActions.transfer, feeName: "default" },
                        { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
                        { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
                    endorserList: [],
                    mintLimit: 1,
                    transferLimit: 1,
                    burnable: burnable,
                    transferable: true,
                    modifiable: true,
                    pub: false

                };

                return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleToken, overrides).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Approve - checkDuplication", function () {
                let overrides = {
                    tokenFees: [
                        { action: NonFungibleTokenActions.transfer, feeName: "default" },
                        { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
                        { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
                    endorserList: [],
                    mintLimit: 1,
                    transferLimit: 1,
                    burnable: burnable,
                    transferable: true,
                    modifiable: true,
                    pub: false
                };

                return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleToken, overrides).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                }); true
            });

            it("State", function () {
                return issuerNonFungibleToken.getState().then((state) => {
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(state));
                });
            });




            // let issuer be a nftMinter
            let nftMinter: token.NonFungibleToken;
            // random item id
            let itemId = crypto.randomBytes(16).toString('hex');

            it("Mint item -- owner", function () {
                nftMinter = new NonFungibleToken(symbol, issuer);
                const itemProp = {
                    symbol: symbol,
                    itemID: itemId,
                    properties: "item properties",
                    metadata: "item metadata"
                } as token.NonFungibleTokenItem;

                return nftMinter.mint(wallet.address, itemProp).then((receipt) => {
                    expect(receipt.status).to.equal(1);
                });
            });

            let mintedNFTItem: NonFungibleTokenItem;

            it("Get item parent properties", function () {
                return NonFungibleTokenItem.fromSymbol(symbol, itemId, wallet).then((nftItem) => {
                    expect(nftItem).exist;
                    mintedNFTItem = nftItem;
                    expect(mintedNFTItem.parent.symbol).to.equal(symbol);

                    if (!silent) console.log(mintedNFTItem.parent.state);
                })
            });


            it("Burn Item", function () {
                let nftItemInst = new NonFungibleTokenItem(symbol, itemId, wallet);

                return nftItemInst.getState().then((state) => {
                    console.log("item state " + JSON.stringify(state));
                    return nftItemInst.burn().then((receipt) => {
                        if (burnable) expect(receipt.status).to.equal(1);
                        else expect(receipt).to.not.exist;
                    });
                }).catch(err => {
                    if (!burnable) expect(err.code).to.equal(errors.NOT_ALLOWED);
                })
            });
        });
    });


    function performNonFungibleTokenStatus(symbol: string, perform: any, overrides?: any) {
        return perform(symbol, provider, overrides).then((transaction) => {
            return token.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {

            return token.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                expect(receipt.status).to.equal(1);

                if (overrides && overrides.notRefresh) {
                    return receipt;
                }
                return refresh(symbol).then(() => {
                    return receipt;
                });
            });
        });
    }

    function refresh(symbol: string) {
        return token.NonFungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            nonFungibleToken = token;
            if (!silent) console.log(indent, "STATE:", JSON.stringify(nonFungibleToken.state));
        }).then(() => {
            return token.NonFungibleToken.fromSymbol(symbol, issuer).then((token) => {
                expect(token).to.exist;
                issuerNonFungibleToken = token;
            });
        });
    }
}
