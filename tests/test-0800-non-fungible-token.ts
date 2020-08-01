'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, nonFungibleToken as token, errors } from '../src.ts/index';
import { bigNumberify, hexlify, randomBytes } from '../src.ts/utils';
import { nodeProvider } from "./env";

import * as crypto from "crypto";
import { NonFungibleTokenActions } from '../src.ts/non-fungible-token';
import { NonFungibleTokenItem } from '../src.ts/non-fungible-token-item';
import { AddressZero } from '../src.ts/constants';

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
let mintedNFTItem: NonFungibleTokenItem;

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

if ("" != nodeProvider.nonFungibleToken.middleware) {
    describe('Suite: NonFungibleToken - private', function () {
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

            if (!silent) console.log(indent, "Middleware:", JSON.stringify({ address: middleware.address, mnemonic: middleware.mnemonic }));
            if (!silent) console.log(indent, "Fee collector:", JSON.stringify({ address: nodeProvider.nonFungibleToken.feeCollector }));
        });
    });

    [false, true].forEach((transferable) => {
        [false, true].forEach((modifiable) => {
            [false, true].forEach((burnable) => {
                [false, true].forEach((pub) => {
                    describe('Suite: NonFungibleToken - ' + JSON.stringify({ transferable, modifiable, burnable, pub }), function () {
                        this.slow(slowThreshold); // define the threshold for slow indicator
                        let symbol = "NFT" + hexlify(randomBytes(4)).substring(2);

                        it("Create - challenge negative application fee", function () {
                            let nonFungibleTokenProperties = {
                                name: "MY" + symbol,
                                symbol: symbol,
                                fee: {
                                    to: nodeProvider.nonFungibleToken.feeCollector,
                                    value: bigNumberify("-1")
                                },
                                metadata: "metadata",
                                properties: "properties"
                            };

                            return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
                                expect(token).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NUMERIC_FAULT);
                            });
                        });

                        it("Create", function () {
                            nonFungibleTokenProperties = {
                                name: "MY" + symbol,
                                symbol: symbol,
                                fee: {
                                    to: nodeProvider.nonFungibleToken.feeCollector,
                                    value: bigNumberify("1")
                                },
                                metadata: "metadata",
                                properties: "properties"
                            };

                            return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
                                expect(token).to.exist;
                            });
                        });

                        it("Create - Check Duplication", function () {
                            return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer).then((token) => {
                                expect(token).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.EXISTS);
                            });
                        });

                        it("Query", function () {
                            return refresh(nonFungibleTokenProperties.symbol).then(() => {
                                expect(issuerNonFungibleToken).to.exist;
                                if (!silent) console.log(indent, "Created Token:", JSON.stringify(issuerNonFungibleToken.state));
                            });
                        });

                        it("Challenge update endorser list before token being approved", function () {
                            let endorsers = [wallet.address, provider.address]
                            return issuerNonFungibleToken.updateEndorserList(endorsers).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_AVAILABLE);
                            });
                        });

                        it("Challenge transfer ownership before token being approved", function () {
                            return issuerNonFungibleToken.transferOwnership(wallet.address).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_AVAILABLE);
                            });
                        });

                        it("Approve - challenge wrong fee setting", function () {
                            let overrides = {
                                tokenFees: [
                                    { action: NonFungibleTokenActions.transfer, feeName: "anything" },
                                    { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
                                    { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" },
                                    { action: NonFungibleTokenActions.endorse, feeName: "default" },
                                    { action: NonFungibleTokenActions.updateNFTEndorserList, feeName: "default" }
                                ],
                                endorserList: [],
                                mintLimit: 1,
                                transferLimit: 1,
                                burnable,
                                transferable,
                                modifiable,
                                pub
                            };

                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleToken, overrides).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.MISSING_FEES);
                            });
                        });

                        it("Approve", function () {
                            let overrides = {
                                tokenFees: [
                                    { action: NonFungibleTokenActions.transfer, feeName: "default" },
                                    { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
                                    { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" },
                                    { action: NonFungibleTokenActions.endorse, feeName: "default" },
                                    { action: NonFungibleTokenActions.updateNFTEndorserList, feeName: "default" }
                                ],
                                endorserList: [],
                                mintLimit: 1,
                                transferLimit: 1,
                                burnable,
                                transferable,
                                modifiable,
                                pub
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
                                    { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" },
                                    { action: NonFungibleTokenActions.endorse, feeName: "default" },
                                    { action: NonFungibleTokenActions.updateNFTEndorserList, feeName: "default" }
                                ],
                                endorserList: [],
                                mintLimit: 1,
                                transferLimit: 1,
                                burnable,
                                transferable,
                                modifiable,
                                pub
                            };

                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleToken, overrides).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("State", function () {
                            return issuerNonFungibleToken.getState().then((state) => {
                                expect(state).is.exist;
                                expect(state).have.property("name").is.eq("MY" + symbol);
                                expect(state).have.property("symbol").is.eq(symbol);
                                expect(state).have.property("owner").is.eq(issuer.address);
                                expect(state).have.property("newOwner").is.empty;
                                expect(state).have.property("metadata").is.eq("metadata");
                                expect(state).have.property("properties").is.eq("properties");
                                expect(state).have.property("endorserList").is.an("array").to.have.lengthOf(0);
                                expect(state).have.property("transferLimit").is.satisfy(function (value) { return value.eq(1) });
                                expect(state).have.property("mintLimit").is.satisfy(function (value) { return value.eq(1) });
                                expect(state).have.property("totalSupply").is.satisfy(function (value) { return value.eq(0) });

                                if (!silent) console.log(indent, "STATE:", JSON.stringify(state));
                            });
                        });

                        it("Transfer ownership - non-owner", function () {
                            return nonFungibleToken.transferOwnership(issuer.address).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Transfer ownership", function () {
                            return issuerNonFungibleToken.transferOwnership(wallet.address).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                            });
                        });

                        it("Transfer ownership - checkDuplication", function () {
                            return issuerNonFungibleToken.transferOwnership(wallet.address).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Accept ownership - challenge non-approved", function () {
                            return nonFungibleToken.acceptOwnership().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Approve transfer ownership", function () {
                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleTokenOwnership).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                            });
                        });

                        it("Approve transfer ownership - checkDuplication", function () {
                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleTokenOwnership).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.EXISTS);
                            });
                        });

                        it("Accept ownership - challenge non owner", function () {
                            return issuerNonFungibleToken.acceptOwnership().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Accept ownership", function () {
                            return nonFungibleToken.acceptOwnership().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                            });
                        });

                        it("Accept ownership - checkDuplication", function () {
                            return nonFungibleToken.acceptOwnership().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Update NFT metadata - non owner", function () {
                            return issuerNonFungibleToken.updateMetadata("Updated metadata").then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Update metadata", function () {
                            return nonFungibleToken.updateMetadata("Updated metadata").then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                return refresh(nonFungibleTokenProperties.symbol).then(() => {
                                    expect(nonFungibleToken).to.exist;
                                    expect(nonFungibleToken).have.property("state").have.property("metadata").is.eq("Updated metadata");
                                    if (!silent) console.log(indent, "Created Token:", JSON.stringify(nonFungibleToken.state));
                                });
                            });
                        });

                        it("Transfer ownership back to issuer", function () {
                            return nonFungibleToken.transferOwnership(issuer.address).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            }).then(() => {
                                return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.approveNonFungibleTokenOwnership).then((receipt) => {
                                    expect(receipt).have.property("status").to.eq(1);
                                });
                            }).then(() => {
                                return issuerNonFungibleToken.acceptOwnership().then((receipt) => {
                                    expect(receipt).have.property("status").to.eq(1);
                                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                                });
                            });
                        });

                        it("Freeze NFT", function () {
                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.freezeNonFungibleToken).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Freeze NFT - mint item should not be allowed", function () {
                            const itemProp: token.NonFungibleTokenItem = {
                                symbol: symbol,
                                itemID: crypto.randomBytes(16).toString('hex'),
                                properties: "item properties",
                                metadata: "item metadata"
                            };

                            return token.NonFungibleToken.fromSymbol(symbol, pub ? wallet : issuer).then((token) => {
                                expect(token).to.exist;
                                return token.mint(wallet.address, itemProp).then((receipt) => {
                                    expect(receipt).is.not.exist;
                                }).catch(error => {
                                    expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                });
                            });
                        });

                        it("Freeze NFT - update metadata should not be allowed", function () {
                            return token.NonFungibleToken.fromSymbol(symbol, issuer).then((token) => {
                                return token.updateMetadata("Updated metadata").then((receipt) => {
                                    expect(receipt).is.not.exist;
                                }).catch(error => {
                                    expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                });
                            });
                        });

                        it("Unfreeze NFT", function () {
                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.unfreezeNonFungibleToken).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        // random item id
                        let itemId = crypto.randomBytes(16).toString('hex');

                        it("Mint item - challenge non owner", function () {
                            if (pub) {
                                return Promise.resolve();
                            }
                            const itemProp: token.NonFungibleTokenItem = {
                                symbol: symbol,
                                itemID: itemId,
                                properties: "item properties",
                                metadata: "item metadata"
                            };

                            return nonFungibleToken.mint(issuer.address, itemProp).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Mint item - challenge zero address", function () {
                            const itemProp: token.NonFungibleTokenItem = {
                                symbol: symbol,
                                itemID: itemId,
                                properties: "item properties",
                                metadata: "item metadata"
                            };

                            return nonFungibleToken.mint(AddressZero, itemProp).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.RECEIVER_KYC_REQUIRED);
                            });
                        });

                        it("Mint item", function () {
                            const itemProp: token.NonFungibleTokenItem = {
                                symbol: symbol,
                                itemID: itemId,
                                properties: "item properties",
                                metadata: "item metadata"
                            };

                            return token.NonFungibleToken.fromSymbol(symbol, pub ? wallet : issuer).then((token) => {
                                expect(token).to.exist;
                                return token.mint(wallet.address, itemProp).then((receipt) => {
                                    expect(receipt).have.property("status").to.eq(1);
                                });
                            });
                        });

                        it("Mint item - challenge mint limit", function () {
                            const itemProp: token.NonFungibleTokenItem = {
                                symbol: symbol,
                                itemID: itemId + itemId,
                                properties: "item properties",
                                metadata: "item metadata"
                            };

                            return token.NonFungibleToken.fromSymbol(symbol, pub ? wallet : issuer).then((token) => {
                                expect(token).to.exist;
                                return token.mint(wallet.address, itemProp).then((receipt) => {
                                    expect(receipt).is.not.exist;
                                }).catch(error => {
                                    expect(error).have.property("code").to.eq(errors.UNEXPECTED_RESULT);
                                });
                            });
                        });

                        it("Get item parent properties", function () {
                            return NonFungibleTokenItem.fromSymbol(symbol, itemId, wallet).then((nftItem) => {
                                expect(nftItem).exist;
                                expect(nftItem).have.property("symbol").is.eq(symbol);
                                expect(nftItem).have.property("itemID").is.eq(itemId);
                                expect(nftItem).have.property("parent").have.property("symbol").is.eq(symbol);
                                mintedNFTItem = nftItem;
                            });
                        });

                        it("Update NFT item metadata - non holder", function () {
                            return NonFungibleTokenItem.fromSymbol(symbol, itemId, modifiable ? issuer : wallet).then((nftItem) => {
                                expect(nftItem).exist;
                                expect(nftItem).have.property("symbol").is.eq(symbol);
                                expect(nftItem).have.property("itemID").is.eq(itemId);
                                expect(nftItem).have.property("parent").have.property("symbol").is.eq(symbol);

                                return nftItem.updateMetadata("Trust me I am the item holder").then((receipt) => {
                                    expect(receipt).is.not.exist;
                                }).catch(error => {
                                    expect(error).have.property("code").to.eq(errors.UNEXPECTED_RESULT);
                                });
                            });
                        });

                        it("Update NFT item metadata", function () {
                            return NonFungibleTokenItem.fromSymbol(symbol, itemId, modifiable ? wallet : issuer).then((nftItem) => {
                                expect(nftItem).exist;
                                expect(nftItem).have.property("symbol").is.eq(symbol);
                                expect(nftItem).have.property("itemID").is.eq(itemId);
                                expect(nftItem).have.property("parent").have.property("symbol").is.eq(symbol);

                                return nftItem.updateMetadata("Hello NFT item").then((receipt) => {
                                    expect(receipt).have.property("status").to.eq(1);
                                });
                            });
                        });

                        it("Transfer NFT item", function () {
                            return mintedNFTItem.transfer(wallet.address).then((receipt) => {
                                if (transferable) expect(receipt).have.property("status").to.eq(1);
                                else expect(receipt).is.not.exist;
                            }).catch(error => {
                                if (!transferable) expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                else throw error;
                            });
                        });

                        it("Transfer NFT item - check duplicate", function () {
                            return mintedNFTItem.transfer(wallet.address).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                if (!transferable) expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                else expect(error).have.property("code").to.eq(errors.UNEXPECTED_RESULT);
                            });
                        });

                        it("Endorse", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Endorse with metadata", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse("Hello blockchain").then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Endorse with metadata and memo", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse("Hello Blockchain", { memo: "Hello Signer" }).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Endorse - challenge metatdata length of unicode word (85*3 one word = 3 length)", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse("跳".repeat(85)).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Endorse - challenge metadata length of unicode word (86*3 one word = 3 length)", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse("跳".repeat(86)).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.UNEXPECTED_RESULT);
                            });
                        });

                        it("Endorse - challenge 256 length of metadata", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse("M".repeat(256)).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Endorse - challenge 257 length of metadata", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse("M".repeat(257)).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.UNEXPECTED_RESULT);
                            });
                        });

                        it("Update endorser list - challenge non owner", function () {
                            let endorsers = [middleware.address];
                            return nonFungibleToken.updateEndorserList(endorsers).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Update endorser list - limit endorser", function () {
                            let endorsers = [middleware.address];
                            return issuerNonFungibleToken.updateEndorserList(endorsers).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                return refresh(nonFungibleTokenProperties.symbol).then(() => {
                                    expect(issuerNonFungibleToken).to.exist;
                                    if (!silent) console.log(indent, "Updated Token Endorser list:", JSON.stringify(issuerNonFungibleToken.state));
                                });
                            });
                        });

                        it("Endorse - invalid endorser", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Endorse - valid endorser", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, middleware);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Update endorser list - anyone can endorse", function () {
                            let endorsers = [];
                            return issuerNonFungibleToken.updateEndorserList(endorsers).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                return refresh(nonFungibleTokenProperties.symbol).then(() => {
                                    expect(issuerNonFungibleToken).to.exist;
                                    if (!silent) console.log(indent, "Updated Token Endorser list:", JSON.stringify(issuerNonFungibleToken.state));
                                });
                            });
                        });

                        it("Endorse - anyone can endorse", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Freeze item", function () {
                            return performNonFungibleTokenItemStatus(symbol, itemId, token.NonFungibleToken.freezeNonFungibleTokenItem, null).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                if (!silent) console.log(indent, "FREEZE RECEIPT:", JSON.stringify(receipt));
                            });
                        });

                        it("Freeze item - burn should not be allowed", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.burn().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Freeze item - endorse by owner should be allowed", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Freeze item - endorse by anyone should be allowed", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Unfreeze item", function () {
                            return performNonFungibleTokenItemStatus(symbol, itemId, token.NonFungibleToken.unfreezeNonFungibleTokenItem, null).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                                if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                            });
                        });

                        it("Freeze NFT", function () {
                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.freezeNonFungibleToken).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Freeze NFT - transfer item should not be allowed", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.transfer(wallet.address).then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Freeze NFT - update item metadata should not be allowed", function () {
                            return NonFungibleTokenItem.fromSymbol(symbol, itemId, modifiable ? wallet : issuer).then((nftItem) => {
                                expect(nftItem).exist;
                                expect(nftItem).have.property("symbol").is.eq(symbol);
                                expect(nftItem).have.property("itemID").is.eq(itemId);
                                expect(nftItem).have.property("parent").have.property("symbol").is.eq(symbol);

                                return nftItem.updateMetadata("Hello NFT item").then((receipt) => {
                                    expect(receipt).is.not.exist;
                                }).catch(error => {
                                    expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                });
                            });
                        });

                        it("Freeze NFT - burn item should not be allowed", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.burn().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Freeze NFT - endorse should be allowed", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.endorse().then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Unfreeze NFT", function () {
                            return performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol, token.NonFungibleToken.unfreezeNonFungibleToken).then((receipt) => {
                                expect(receipt).have.property("status").to.eq(1);
                            });
                        });

                        it("Burn item - challenge non owner", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.burn().then((receipt) => {
                                expect(receipt).is.not.exist;
                            }).catch(error => {
                                expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                            });
                        });

                        it("Burn item", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, wallet);
                            return nftItemInstance.burn().then((receipt) => {
                                if (burnable) expect(receipt).have.property("status").to.eq(1);
                                else expect(receipt).is.not.exist;
                            }).catch(error => {
                                if (!burnable) expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                else throw error;
                            });
                        });

                        it("Burn item - challenge endorse item", function () {
                            let nftItemInstance = new NonFungibleTokenItem(symbol, itemId, issuer);
                            return nftItemInstance.endorse().then((receipt) => {
                                if (burnable) expect(receipt).is.not.exist;
                                else expect(receipt).have.property("status").to.eq(1);
                            }).catch(error => {
                                if (!burnable) expect(error).have.property("code").to.eq(errors.NOT_ALLOWED);
                                else expect(error).have.property("code").to.eq(errors.NOT_AVAILABLE);
                            });
                        });
                    });
                });
            });
        });
    });

    describe('Suite: NonFungibleToken - private', function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        it("Clean up", function () {
            providerConnection.removeAllListeners();
        });
    });

    function performNonFungibleTokenStatus(symbol: string, perform: any, overrides?: any) {
        return perform(symbol, provider, overrides).then((transaction) => {
            return token.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                expect(receipt).have.property("status").to.eq(1);

                if (overrides && overrides.notRefresh) {
                    return receipt;
                }
                return refresh(symbol).then(() => {
                    return receipt;
                });
            });
        });
    }

    function performNonFungibleTokenItemStatus(symbol: string, itemID: string, perform: any, overrides?: any) {
        return perform(symbol, itemID, provider, overrides).then((transaction) => {
            return token.NonFungibleToken.signNonFungibleTokenItemStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.NonFungibleToken.sendNonFungibleTokenItemStatusTransaction(transaction, middleware).then((receipt) => {
                expect(receipt).have.property("status").to.eq(1);

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
        return token.NonFungibleToken.fromSymbol(symbol, wallet, null).then((token) => {
            expect(token).to.exist;
            nonFungibleToken = token;
            if (!silent) console.log(indent, "STATE:", JSON.stringify(nonFungibleToken.state));
        }).then(() => {
            return token.NonFungibleToken.fromSymbol(symbol, issuer, null).then((token) => {
                expect(token).to.exist;
                issuerNonFungibleToken = token;
            });
        });
    }
}
