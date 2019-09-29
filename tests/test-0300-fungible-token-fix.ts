'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, token, errors } from '../src.ts/index';
import { bigNumberify, hexlify, randomBytes } from '../src.ts/utils';
import { nodeProvider } from "./env";
import { FungibleTokenActions } from '../src.ts/token';

let indent = "     ";
let silent = false;
let silentRpc = false;
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

describe('Suite: FungibleToken - Fixed Supply', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    if (silent) { silent = nodeProvider.trace.silent; }
    if (silentRpc) { silentRpc = nodeProvider.trace.silentRpc; }

    it("Initialize", function () {
        providerConnection = new mxw.providers.JsonRpcProvider(nodeProvider.connection, nodeProvider).on("rpc", function (args) {
            if (!silentRpc) {
                if ("response" == args.action) {
                    console.log(indent, "RPC REQ:", JSON.stringify(args.request));
                    console.log(indent, "    RES:", JSON.stringify(args.response));
                }
            }
        });

        // We need to use KYCed wallet to create fungible token
        wallet = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer)
            .connect(providerConnection);
        expect(wallet).to.exist;
        if (!silent) console.log(indent, "Wallet:", JSON.stringify(wallet));

        provider = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.provider).connect(providerConnection);
        expect(provider).to.exist;
        if (!silent) console.log(indent, "Provider:", JSON.stringify(provider));

        issuer = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.issuer).connect(providerConnection);
        expect(issuer).to.exist;
        if (!silent) console.log(indent, "Issuer:", JSON.stringify(issuer));

        middleware = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.middleware).connect(providerConnection);
        expect(middleware).to.exist;
        if (!silent) console.log(indent, "Middleware:", JSON.stringify(middleware));
    });
});

describe('Suite: FungibleToken - Fixed Supply (Not Burnable)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY FIX " + hexlify(randomBytes(4)).substring(2),
            symbol: "FIX" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: true,
            maxSupply: bigNumberify("100000000000000000000000000"),
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

    it("Create - checkDuplication", function () {
        return token.FungibleToken.create(fungibleTokenProperties, wallet).then((token) => {
            expect(token).is.not.exist;
        }).catch(error => {
            expect(error.code).to.equal(errors.EXISTS);
        });
    });

    it("Query - by wallet", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });
    it("Query - by issuer", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
        });
    });

    it("Approve - challenge missing fee setting", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: false
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware);
        }).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_AVAILABLE);
        });
    });

    it("Approve - challenge wrong fee setting", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transfer, feeName: "anything" },
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: false
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware);
        }).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_AVAILABLE);
        });
    });

    it("Approve", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transfer, feeName: "default" },
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: false
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "ApproveFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Approve - checkDuplication", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transfer, feeName: "default" },
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: false
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware);
        }).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_ALLOWED);
        });
    });

    it("Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Approved Token:", JSON.stringify(fungibleToken.state));
        });
    });

    it("Balance - owner", function () {
        return fungibleToken.refresh().then(() => {
            return fungibleToken.getBalance().then((balance) => {
                if (!silent) console.log(indent, "Owner balance:", mxw.utils.formatUnits(balance, fungibleToken.state.decimals));
                expect(balance.toString()).to.equal(fungibleToken.state.totalSupply.toString());
            });
        });
    });

    it("Transfer", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Owner transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });

    it("Transfer -  self transfer", function () {
        return fungibleToken.getBalance().then((startBalance) => {
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: startBalance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(wallet.address, startBalance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Owner transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            }).then(() => {
                return fungibleToken.getBalance().then((balance) => {
                    expect(balance.toString()).to.equal(startBalance.toString());
                });
            });
        });
    });

    it("Balance - receiver", function () {
        return issuerFungibleToken.refresh().then(() => {
            return issuerFungibleToken.getBalance().then((balance) => {
                if (!silent) console.log(indent, "Receiver balance:", mxw.utils.formatUnits(balance, issuerFungibleToken.state.decimals));
                expect(balance.toString()).to.equal(issuerFungibleToken.state.totalSupply.div(2).toString());
            });
        });
    });

    it("Burn - challenge non-burnable token", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            return issuerFungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_AVAILABLE);
            });
        });
    });

    it("Query Account", function () {
        return wallet.provider.getTokenAccountState(fungibleToken.symbol, wallet.address).then((state) => {
            if (!silent) console.log(indent, "Owner account:", JSON.stringify(state));
        });
    });

    it("Freeze", function () {
        return token.FungibleToken.freezeFungibleToken(fungibleToken.symbol, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "FreezeFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Freeze - checkDuplication", function () {
        return token.FungibleToken.freezeFungibleToken(fungibleToken.symbol, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "FreezeFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_ALLOWED);
        });
    });

    it("Frozen Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Frozen Token:", JSON.stringify(fungibleToken.state));
        });
    });

    it("Transfer - challenge frozen token", function () {
        return fungibleToken.getBalance().then((balance) => {
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    expect(receipt.status).to.equal(0);
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });
        });
    });

    it("Unfreeze", function () {
        return token.FungibleToken.unfreezeFungibleToken(fungibleToken.symbol, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "UnfreezeFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Unfreeze - checkDuplication", function () {
        return token.FungibleToken.unfreezeFungibleToken(fungibleToken.symbol, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "UnfreezeFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_ALLOWED);
        });
    });

    it("Unfreeze Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Unfreeze Token:", JSON.stringify(fungibleToken.state));
        });
    });

    it("Transfer - after unfreeze token", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Owner transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });

    it("Freeze Account", function () {
        return token.FungibleToken.freezeFungibleTokenAccount(fungibleToken.symbol, wallet.address, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenAccountStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenAccountStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "FreezeFungibleTokenAccount RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Freeze Account - checkDuplication", function () {
        return token.FungibleToken.freezeFungibleTokenAccount(fungibleToken.symbol, wallet.address, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenAccountStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenAccountStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "FreezeFungibleTokenAccount RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_ALLOWED);
        });
    });

    it("Frozen Account Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Frozen Account Status:", JSON.stringify(fungibleToken.accountState));
        });
    });

    it("Transfer - challenge frozen account", function () {
        return fungibleToken.getBalance().then((balance) => {
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    expect(receipt.status).to.equal(0);
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });
        });
    });

    it("Unfreeze Account", function () {
        return token.FungibleToken.unfreezeFungibleTokenAccount(fungibleToken.symbol, wallet.address, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenAccountStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenAccountStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "UnfreezeFungibleTokenAccount RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Unfreeze Account - checkDuplication", function () {
        return token.FungibleToken.unfreezeFungibleTokenAccount(fungibleToken.symbol, wallet.address, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenAccountStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenAccountStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "UnfreezeFungibleTokenAccount RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_ALLOWED);
        });
    });

    it("Unfreeze Account Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Unfreeze Account Status:", JSON.stringify(fungibleToken.accountState));
        });
    });

    it("Transfer - after unfreeze account", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Owner transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });
});

describe('Suite: FungibleToken - Fixed Supply (Burnable)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY FIX " + hexlify(randomBytes(4)).substring(2),
            symbol: "FIX" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: true,
            maxSupply: bigNumberify("100000000000000000000000000"),
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

    it("Create - checkDuplication", function () {
        return token.FungibleToken.create(fungibleTokenProperties, wallet).then((token) => {
            expect(token).is.not.exist;
        }).catch(error => {
            expect(error.code).to.equal(errors.EXISTS);
        });
    });

    it("Query - by wallet", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });
    it("Query - by issuer", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
        });
    });

    it("Approve - challenge missing fee setting", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transfer, feeName: "default" },
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: true
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_AVAILABLE);
        });
    });

    it("Approve", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transfer, feeName: "default" },
                { action: FungibleTokenActions.burn, feeName: "default" },
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: true
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "ApproveFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Approve - checkDuplication", function () {
        let overrides = {
            tokenFees: [
                { action: FungibleTokenActions.transfer, feeName: "default" },
                { action: FungibleTokenActions.burn, feeName: "zero" },
                { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
            ],
            burnable: true
        };
        return token.FungibleToken.approveFungibleToken(fungibleToken.symbol, provider, overrides).then((transaction) => {
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware);
        }).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_ALLOWED);
        });
    });

    it("Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Approved Token:", JSON.stringify(fungibleToken.state));
        });
    });

    it("Balance - owner", function () {
        return fungibleToken.refresh().then(() => {
            return fungibleToken.getBalance().then((balance) => {
                if (!silent) console.log(indent, "Owner balance:", mxw.utils.formatUnits(balance, fungibleToken.state.decimals));
                expect(balance.toString()).to.equal(fungibleToken.state.totalSupply.toString());
            });
        });
    });

    it("Transfer -  self transfer", function () {
        return fungibleToken.getBalance().then((startBalance) => {
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: wallet.address,
                value: startBalance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(wallet.address, startBalance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Owner transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            }).then(() => {
                return fungibleToken.getBalance().then((balance) => {
                    expect(balance.toString()).to.equal(startBalance.toString());
                });
            });
        });
    });

    it("Transfer", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);

            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: wallet.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Owner transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });

    it("Balance - Receiver", function () {
        return issuerFungibleToken.refresh().then(() => {
            return issuerFungibleToken.getBalance().then((balance) => {
                if (!silent) console.log(indent, "Receiver balance:", mxw.utils.formatUnits(balance, issuerFungibleToken.state.decimals));
                expect(balance.toString()).to.equal(issuerFungibleToken.state.totalSupply.div(2).toString());
            });
        });
    });

    it("Burn", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            return issuerFungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(1);
            });
        });
    });

    it("Query Account", function () {
        return wallet.provider.getTokenAccountState(fungibleToken.symbol, wallet.address).then((state) => {
            if (!silent) console.log(indent, "Owner account:", JSON.stringify(state));
        });
    });
});

describe('Suite: FungibleToken - Fixed Supply (Reject)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY FIX " + hexlify(randomBytes(4)).substring(2),
            symbol: "FIX" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: true,
            maxSupply: bigNumberify("100000000000000000000000000"),
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

    it("Create - checkDuplication", function () {
        return token.FungibleToken.create(fungibleTokenProperties, wallet).then((token) => {
            expect(token).is.not.exist;
        }).catch(error => {
            expect(error.code).to.equal(errors.EXISTS);
        });
    });

    it("Query - By wallet", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });

    it("Reject", function () {
        return token.FungibleToken.rejectFungibleToken(fungibleToken.symbol, provider).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Provider signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            expect(transaction).to.exist;
            if (!silent) console.log(indent, "Issuer signed transaction:", JSON.stringify(transaction));
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware, defaultOverrides);
        }).then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "RejectFungibleToken RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Reject - checkDuplication", function () {
        return token.FungibleToken.rejectFungibleToken(fungibleToken.symbol, provider).then((transaction) => {
            return token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer);
        }).then((transaction) => {
            return token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware);
        }).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(0);
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_FOUND);
        });
    });

    it("Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
        }).catch(error => {
            expect(error.code).to.equal(errors.NOT_FOUND);
        });
    });
});

describe('Suite: FungibleToken', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Clean up", function () {
        providerConnection.removeAllListeners("rpc");
    });
});