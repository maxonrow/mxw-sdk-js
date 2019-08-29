'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, token, errors } from '../src.ts/index';
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

describe('Suite: FungibleToken', function () {
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

describe('Suite: FungibleToken - Dynamic Supply', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY DYN " + hexlify(randomBytes(4)).substring(2),
            symbol: "DYN" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: false,
            totalSupply: bigNumberify("0"),
            fee: {
                to: nodeProvider.fungibleToken.feeCollector,
                value: bigNumberify("100000000000000000")
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

    it("Query - Wallet", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });
    it("Query - Issuer", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
        });
    });

    it("Approve", function () {
        let overrides = {
            transferFee: bigNumberify("500000000000000000"),
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
            transferFee: bigNumberify("500000000000000000"),
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

    it("Mint", function () {
        return fungibleToken.mint(wallet.address, "22000000000000000000").then((receipt) => {
            expect(receipt).to.exist;
            if (!silent) console.log(indent, "FungibleToken.mint RECEIPT:", JSON.stringify(receipt));
            expect(receipt.status).to.equal(1);
        });
    });

    it("Balance - Owner", function () {
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
            return fungibleToken.provider.getTokenTransactionFee(fungibleToken.symbol, "transfer").then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee: fee }).then((receipt) => {
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
                if (!silent) console.log(indent, "Receiver burn RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
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

    it("Freeze Account Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Freeze Token Account Status:", JSON.stringify(fungibleToken.state));
        });
    });

});

describe('Suite: FungibleToken - Dynamic Supply (Reject)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY DYN " + hexlify(randomBytes(4)).substring(2),
            symbol: "DYN" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: false,
            totalSupply: bigNumberify("0"),
            fee: {
                to: nodeProvider.fungibleToken.feeCollector,
                value: bigNumberify("100000000000000000")
            },
            metadata: ""
        };

        return token.FungibleToken.create(fungibleTokenProperties, wallet, defaultOverrides).then((token) => {
            expect(token).to.exist;
            fungibleToken = token as token.FungibleToken;
        });
    });

    it("Query - Wallet", function () {
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

describe('Suite: FungibleToken - Fixed Supply (Burnable)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY FIX " + hexlify(randomBytes(4)).substring(2),
            symbol: "FIX" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: true,
            totalSupply: bigNumberify("100000000000000000000000000"),
            fee: {
                to: nodeProvider.fungibleToken.feeCollector,
                value: bigNumberify("100000000000000000")
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

    it("Query - Wallet", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });
    it("Query - Issuer", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
        });
    });

    it("Approve", function () {
        let overrides = {
            transferFee: bigNumberify("500000000000000000"),
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
            transferFee: bigNumberify("500000000000000000"),
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

    it("Balance - Owner", function () {
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
            return fungibleToken.provider.getTokenTransactionFee(fungibleToken.symbol, "transfer").then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee: fee }).then((receipt) => {
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
                if (!silent) console.log(indent, "Receiver burn RECEIPT:", JSON.stringify(receipt));
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

describe('Suite: FungibleToken - Fixed Supply (Not Burnable)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY FIX " + hexlify(randomBytes(4)).substring(2),
            symbol: "FIX" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: true,
            totalSupply: bigNumberify("100000000000000000000000000"),
            fee: {
                to: nodeProvider.fungibleToken.feeCollector,
                value: bigNumberify("100000000000000000")
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

    it("Query - Wallet", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });
    it("Query - Issuer", function () {
        return token.FungibleToken.fromSymbol(fungibleToken.symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
        });
    });

    it("Approve", function () {
        let overrides = {
            transferFee: bigNumberify("500000000000000000"),
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
            transferFee: bigNumberify("500000000000000000"),
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

    it("Balance - Owner", function () {
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
            return fungibleToken.provider.getTokenTransactionFee(fungibleToken.symbol, "transfer").then((fee) => {
                return fungibleToken.transfer(issuer.address, balance, { fee: fee }).then((receipt) => {
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
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
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
            totalSupply: bigNumberify("100000000000000000000000000"),
            fee: {
                to: nodeProvider.fungibleToken.feeCollector,
                value: bigNumberify("100000000000000000")
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

    it("Query - Wallet", function () {
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