'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, token, errors } from '../src.ts/index';
import { bigNumberify, hexlify, randomBytes } from '../src.ts/utils';
import { nodeProvider } from "./env";
import { FungibleTokenActions } from '../src.ts/token';

let indent = "     ";
let silent = true;
let silentRpc = true;
let slowThreshold = 9000;

let providerConnection: mxw.providers.Provider;
let wallet: mxw.Wallet;
let provider: mxw.Wallet;
let issuer: mxw.Wallet;
let middleware: mxw.Wallet;

let fungibleTokenProperties: token.FungibleTokenProperties;
let fungibleToken: token.FungibleToken;
let issuerFungibleToken: token.FungibleToken;

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

if ("" != nodeProvider.fungibleToken.middleware) {
    describe('Suite: FungibleToken - Dynamic Supply', function () {
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

    [true, false].forEach((unlimited) => {
        describe('Suite: FungibleToken - Dynamic Supply ' + (unlimited ? "(Unlimited)" : "(Limited)"), function () {
            this.slow(slowThreshold); // define the threshold for slow indicator

            it("Create", function () {
                let symbol = "DYN" + hexlify(randomBytes(4)).substring(2);
                fungibleTokenProperties = {
                    name: "MY " + symbol,
                    symbol: symbol,
                    decimals: 18,
                    fixedSupply: false,
                    maxSupply: unlimited ? bigNumberify("0") : bigNumberify("100000000000000000000000000"),
                    fee: {
                        to: nodeProvider.fungibleToken.feeCollector,
                        value: bigNumberify("1")
                    },
                    metadata: ""
                };

                return token.FungibleToken.create(fungibleTokenProperties, issuer, defaultOverrides).then((token) => {
                    expect(token).to.exist;
                    issuerFungibleToken = token as token.FungibleToken;
                });
            });

            it("Create - checkDuplication", function () {
                return token.FungibleToken.create(fungibleTokenProperties, issuer).then((token) => {
                    expect(token).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.EXISTS);
                });
            });

            it("Query", function () {
                return refresh(fungibleTokenProperties.symbol).then(() => {
                    expect(fungibleToken).to.exist;
                    if (!silent) console.log(indent, "Created Token:", JSON.stringify(fungibleToken.state));
                });
            });

            it("Approve - challenge wrong fee setting", function () {
                let overrides = {
                    tokenFees: [
                        { action: FungibleTokenActions.transfer, feeName: "anything" },
                        { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                        { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
                    burnable: true
                };
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.approveFungibleToken, overrides).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.MISSING_FEES);
                });
            });

            it("Approve", function () {
                let overrides = {
                    tokenFees: [
                        { action: FungibleTokenActions.mint, feeName: "transfer" },
                        { action: FungibleTokenActions.burn, feeName: "transfer" },
                        { action: FungibleTokenActions.transfer, feeName: "transfer" },
                        { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                        { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
                    burnable: true
                };
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.approveFungibleToken, overrides).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Approve - checkDuplication", function () {
                let overrides = {
                    tokenFees: [
                        { action: FungibleTokenActions.mint, feeName: "default" },
                        { action: FungibleTokenActions.burn, feeName: "default" },
                        { action: FungibleTokenActions.transfer, feeName: "default" },
                        { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                        { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
                    burnable: true
                };
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.approveFungibleToken, overrides).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("State", function () {
                return issuerFungibleToken.getState().then((state) => {
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(state));
                });
            });

            it("Balance - owner", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    if (!silent) console.log(indent, "Owner balance:", mxw.utils.formatUnits(balance, issuerFungibleToken.state.decimals));
                    expect(balance.toString()).to.equal(issuerFungibleToken.state.totalSupply.toString());
                });
            });

            it("Mint - challenge non-owner", function () {
                let value = bigNumberify("100000000000000000000000000");
                return fungibleToken.mint(wallet.address, value).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Mint - challenge fake owner", function () {
                let value = bigNumberify("100000000000000000000000000");
                return fungibleToken.mint(wallet.address, value).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Mint - zero", function () {
                let value = bigNumberify("0");
                return issuerFungibleToken.mint(wallet.address, value).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                }).then(() => {
                    return refresh(fungibleTokenProperties.symbol);
                });
            });

            it("Mint", function () {
                let value = unlimited ? bigNumberify("100000000000000000000000000") : issuerFungibleToken.state.maxSupply;
                return issuerFungibleToken.mint(issuer.address, value).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                }).then(() => {
                    return refresh(fungibleTokenProperties.symbol);
                });
            });

            if (!unlimited) {
                it("Mint - challenge max supply", function () {
                    let value = bigNumberify("1");
                    return issuerFungibleToken.mint(wallet.address, value).then((receipt) => {
                        expect(receipt).is.not.exist;
                    }).catch(error => {
                        expect(error.code).to.equal(errors.NOT_ALLOWED);
                    });
                });
            }

            it("Balance - total supply", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    if (!silent) console.log(indent, "Owner balance:", mxw.utils.formatUnits(balance, issuerFungibleToken.state.decimals));
                    expect(balance.toString()).to.equal(issuerFungibleToken.state.totalSupply.toString());
                });
            });

            it("Transfer - self transfer", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    return issuerFungibleToken.transfer(issuer.address, balance).then((receipt) => {
                        if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                        expect(receipt.status).to.equal(1);
                    }).then(() => {
                        return issuerFungibleToken.getBalance().then((newBalance) => {
                            expect(newBalance.toString()).to.equal(balance.toString());
                        });
                    });
                });
            });

            it("Transfer", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                        symbol: fungibleToken.symbol,
                        from: issuer.address,
                        to: wallet.address,
                        value: balance,
                        memo: "Hello blockchain"
                    }).then((fee) => {
                        return issuerFungibleToken.transfer(wallet.address, balance, { fee }).then((receipt) => {
                            if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                            expect(receipt.status).to.equal(1);
                        });
                    }).then(() => {
                        return issuerFungibleToken.getBalance().then((issuerBalance) => {
                            expect(issuerBalance.toString()).to.equal("0");
                        });
                    }).then(() => {
                        return fungibleToken.getBalance().then((receiverBalance) => {
                            expect(receiverBalance.toString()).to.equal(balance.toString());
                        });
                    });
                });
            });

            it("Burn - zero", function () {
                return fungibleToken.burn(bigNumberify("0")).then((receipt) => {
                    expect(receipt.status).to.equal(1);
                });
            });

            it("Burn - challenge limit", function () {
                return fungibleToken.getBalance().then((balance) => {
                    balance = balance.add(1);
                    return fungibleToken.burn(balance).then((receipt) => {
                        expect(receipt).is.not.exist;
                    }).catch(error => {
                        expect(error.code).to.equal(errors.INSUFFICIENT_FUNDS);
                    });
                });
            });

            it("Burn - partial", function () {
                return fungibleToken.getBalance().then((balance) => {
                    balance = balance.div(2);
                    return fungibleToken.burn(balance).then((receipt) => {
                        expect(receipt.status).to.equal(1);
                    });
                });
            });

            it("Burn", function () {
                return fungibleToken.getBalance().then((balance) => {
                    return fungibleToken.burn(balance).then((receipt) => {
                        expect(receipt.status).to.equal(1);
                    });
                });
            });

            it("Freeze", function () {
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.freezeFungibleToken).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Freeze - checkDuplication", function () {
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.freezeFungibleToken).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Mint - challenge frozen token", function () {
                let value = bigNumberify("100000000000000000000000000");
                return Promise.resolve().then(() => {
                    return issuerFungibleToken.mint(wallet.address, value).then((receipt) => {
                        expect(receipt).is.not.exist;
                    });
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Transfer - challenge frozen token", function () {
                return fungibleToken.getBalance().then((balance) => {
                    return fungibleToken.transfer(issuer.address, balance).then((receipt) => {
                        expect(receipt).is.not.exist;
                    });
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Burn - challenge frozen token", function () {
                return fungibleToken.getBalance().then((balance) => {
                    return fungibleToken.burn(balance).then((receipt) => {
                        expect(receipt).is.not.exist;
                    });
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Unfreeze", function () {
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.unfreezeFungibleToken).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Unfreeze - checkDuplication", function () {
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.unfreezeFungibleToken).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Mint - after unfreeze token", function () {
                let value = bigNumberify("100000000000000000000000000");
                return issuerFungibleToken.mint(issuer.address, value).then((receipt) => {
                    if (!silent) console.log(indent, "Mint RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });

            it("Transfer - after unfreeze token", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    balance = balance.div(2);
                    return issuerFungibleToken.transfer(wallet.address, balance).then((receipt) => {
                        if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                        expect(receipt.status).to.equal(1);
                    });
                });
            });

            it("Burn - after unfreeze token", function () {
                return fungibleToken.getBalance().then((balance) => {
                    balance = balance.div(2);
                    return fungibleToken.burn(balance).then((receipt) => {
                        if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                        expect(receipt.status).to.equal(1);
                    });
                });
            });

            it("Freeze Account", function () {
                return performFungibleTokenAccountStatus(fungibleTokenProperties.symbol, wallet.address, token.FungibleToken.freezeFungibleTokenAccount).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Freeze Account - checkDuplication", function () {
                return performFungibleTokenAccountStatus(fungibleTokenProperties.symbol, wallet.address, token.FungibleToken.freezeFungibleTokenAccount).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Mint - challenge frozen account", function () {
                let value = bigNumberify("100000000000000000000000000");
                return issuerFungibleToken.mint(wallet.address, value).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Transfer - challenge frozen sender account", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    return issuerFungibleToken.transfer(wallet.address, balance).then((receipt) => {
                        expect(receipt).is.not.exist;
                    }).catch(error => {
                        expect(error.code).to.equal(errors.NOT_ALLOWED);
                    });
                });
            });

            it("Transfer - challenge frozen receiver account", function () {
                return fungibleToken.getBalance().then((balance) => {
                    return fungibleToken.transfer(issuer.address, balance).then((receipt) => {
                        expect(receipt).is.not.exist;
                    }).catch(error => {
                        expect(error.code).to.equal(errors.NOT_ALLOWED);
                    });
                });
            });

            it("Burn - challenge frozen account", function () {
                return fungibleToken.getBalance().then((balance) => {
                    return fungibleToken.burn(balance).then((receipt) => {
                        expect(receipt).is.not.exist;
                    }).catch(error => {
                        expect(error.code).to.equal(errors.NOT_ALLOWED);
                    });
                });
            });

            it("Unfreeze Account", function () {
                return performFungibleTokenAccountStatus(fungibleTokenProperties.symbol, wallet.address, token.FungibleToken.unfreezeFungibleTokenAccount).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Unfreeze Account - checkDuplication", function () {
                return performFungibleTokenAccountStatus(fungibleTokenProperties.symbol, wallet.address, token.FungibleToken.unfreezeFungibleTokenAccount).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Mint - after unfreeze account", function () {
                let value = bigNumberify("10");
                return issuerFungibleToken.mint(issuer.address, value).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });

            it("Transfer - after unfreeze account", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    return issuerFungibleToken.transfer(issuer.address, balance).then((receipt) => {
                        if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                        expect(receipt.status).to.equal(1);
                    });
                });
            });

            it("Burn - after unfreeze account", function () {
                return issuerFungibleToken.getBalance().then((balance) => {
                    return issuerFungibleToken.burn(balance).then((receipt) => {
                        if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                        expect(receipt.status).to.equal(1);
                    });
                });
            });

            it("Transfer ownership - non-owner", function () {
                return fungibleToken.transferOwnership(issuer.address).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Transfer ownership", function () {
                return issuerFungibleToken.transferOwnership(wallet.address).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });

            it("Transfer ownership - checkDuplication", function () {
                return issuerFungibleToken.transferOwnership(wallet.address).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Accept ownership - challenge non-approval", function () {
                return fungibleToken.acceptOwnership().then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Approve transfer ownership", function () {
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.approveFungibleTokenOwnership).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Approve transfer ownership - checkDuplication", function () {
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.approveFungibleTokenOwnership).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.EXISTS);
                });
            });

            it("Accept ownership - challenge non owner", function () {
                return issuerFungibleToken.acceptOwnership().then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("Accept ownership", function () {
                return fungibleToken.acceptOwnership().then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });

            it("Accept ownership - checkDuplication", function () {
                return fungibleToken.acceptOwnership().then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });

            it("State", function () {
                return issuerFungibleToken.getState().then((state) => {
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(state));
                });
            });
        });

        describe('Suite: FungibleToken - Dynamic Supply ' + (unlimited ? "(Unlimited - Reject)" : "(Limited - Reject)"), function () {
            this.slow(slowThreshold); // define the threshold for slow indicator

            it("Create", function () {
                let symbol = "DYN" + hexlify(randomBytes(4)).substring(2);
                fungibleTokenProperties = {
                    name: "MY " + symbol,
                    symbol: symbol,
                    decimals: 18,
                    fixedSupply: false,
                    maxSupply: bigNumberify("0"),
                    fee: {
                        to: nodeProvider.fungibleToken.feeCollector,
                        value: bigNumberify("1")
                    },
                    metadata: ""
                };

                return token.FungibleToken.create(fungibleTokenProperties, wallet, defaultOverrides).then((token) => {
                    expect(token).to.exist;
                    fungibleToken = token as token.FungibleToken;
                });
            });

            it("Reject", function () {
                let overrides = {
                    notRefresh: true
                };
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.rejectFungibleToken, overrides).then((receipt) => {
                    if (!silent) console.log(indent, "RECEIPT:", JSON.stringify(receipt));
                });
            });

            it("Reject - checkDuplication", function () {
                let overrides = {
                    notRefresh: true
                };
                return performFungibleTokenStatus(fungibleTokenProperties.symbol, token.FungibleToken.rejectFungibleToken, overrides).then((receipt) => {
                    expect(receipt).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_FOUND);
                });
            });

            it("Status", function () {
                let symbol = fungibleToken.symbol;
                return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
                    expect(token).is.not.exist;
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_FOUND);
                });
            });
        });
    });

    describe('Suite: FungibleToken - Dynamic Supply', function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        it("Clean up", function () {
            providerConnection.removeAllListeners();
        });
    });

    function performFungibleTokenStatus(symbol: string, perform: any, overrides?: any) {
        return perform(symbol, provider, overrides).then((transaction) => {
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
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

    function performFungibleTokenAccountStatus(symbol: string, target: string, perform: any, overrides?: any) {
        return perform(symbol, target, provider, overrides).then((transaction) => {
            return token.FungibleToken.signFungibleTokenAccountStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenAccountStatusTransaction(transaction, middleware).then((receipt) => {
                expect(receipt.status).to.equal(1);
                return refresh(symbol).then(() => {
                    return receipt;
                });
            });
        });
    }

    function refresh(symbol: string) {
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "STATE:", JSON.stringify(fungibleToken.state));
        }).then(() => {
            return token.FungibleToken.fromSymbol(symbol, issuer).then((token) => {
                expect(token).to.exist;
                issuerFungibleToken = token;
            });
        });
    }
}
