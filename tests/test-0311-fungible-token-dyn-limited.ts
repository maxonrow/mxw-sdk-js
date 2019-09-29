'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, token, errors } from '../src.ts/index';
import { bigNumberify, hexlify, randomBytes, iterate } from '../src.ts/utils';
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

describe('Suite: FungibleToken - Dynamic Supply - Limited', function () {
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
        wallet = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.provider).connect(providerConnection);
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

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY DYN " + hexlify(randomBytes(4)).substring(2),
            symbol: "DYN" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: false,
            maxSupply: bigNumberify("100000000000000000000000000"),
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

    it("Query - By wallet", function () {
        return token.FungibleToken.fromSymbol(issuerFungibleToken.symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Created Token:", JSON.stringify(token.state));
        });
    });
    it("Query - By issuer", function () {
        return token.FungibleToken.fromSymbol(issuerFungibleToken.symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
        });
    });

    it("Approve", function () {
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
                { action: FungibleTokenActions.mint, feeName: "default" },
                { action: FungibleTokenActions.burn, feeName: "default" },
                { action: FungibleTokenActions.transfer, feeName: "default" },
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

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Status", function () {
        let symbol = fungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, wallet).then((token) => {
            expect(token).to.exist;
            fungibleToken = token;
            if (!silent) console.log(indent, "Approved Token:", JSON.stringify(fungibleToken.state));
        }).then(() => {
            return issuerFungibleToken.getBalance().then((balance) => {
                expect(balance.toString()).to.equal("0");
            });
        });
    });

    it("Mint", function () {
        let value = issuerFungibleToken.state.maxSupply;
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: issuer.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(issuer.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Mint RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Mint - zero", function () {
        let value = bigNumberify("0");
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: wallet.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(wallet.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Mint RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });
    });

    it("Mint - challenge max supply", function () {
        let value = bigNumberify("1");
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: wallet.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(wallet.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Mint - challenge non-owner", function () {
        let value = bigNumberify("100000000000000000000000000");
        return wallet.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: fungibleToken.symbol,
            to: wallet.address,
            value: value.toString(),
            owner: wallet.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return fungibleToken.mint(wallet.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Mint - challenge fake owner", function () {
        let value = bigNumberify("100000000000000000000000000");
        return wallet.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: wallet.address,
            value: value.toString(),
            owner: wallet.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return fungibleToken.mint(wallet.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Balance - total supply", function () {
        return issuerFungibleToken.getState().then(() => {
            return issuerFungibleToken.getBalance().then((balance) => {
                if (!silent) console.log(indent, "Owner balance:", mxw.utils.formatUnits(balance, issuerFungibleToken.state.decimals));
                expect(balance.toString()).to.equal(issuerFungibleToken.state.totalSupply.toString());
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Transfer - self transfer", function () {
        return issuerFungibleToken.getBalance().then((startBalance) => {
            return wallet.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: fungibleToken.symbol,
                from: issuer.address,
                to: issuer.address,
                value: startBalance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return issuerFungibleToken.transfer(issuer.address, startBalance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            }).then(() => {
                return issuerFungibleToken.getBalance().then((balance) => {
                    expect(balance.toString()).to.equal(startBalance.toString());
                });
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

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
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Balance - Owner", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            if (!silent) console.log(indent, "Owner balance:", mxw.utils.formatUnits(balance, issuerFungibleToken.state.decimals));
            expect(balance.toString()).to.equal("0");
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Balance - Receiver", function () {
        return fungibleToken.getState().then(() => {
            return fungibleToken.getBalance().then((balance) => {
                if (!silent) console.log(indent, "Receiver balance:", mxw.utils.formatUnits(balance, fungibleToken.state.decimals));
                expect(balance.toString()).to.equal(fungibleToken.state.totalSupply.toString());
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - zero", function () {
        return fungibleToken.burn(bigNumberify("0")).then((receipt) => {
            expect(receipt).to.exist;
            expect(receipt.status).to.equal(1);
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - challenge limit", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.add(1);
            return fungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.INSUFFICIENT_FUNDS);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - partial", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);
            return fungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(1);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn", function () {
        return fungibleToken.getBalance().then((balance) => {
            return fungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(1);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

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

    it("Mint - challenge frozen token", function () {
        let value = bigNumberify("100000000000000000000000000");
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: wallet.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(wallet.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

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

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - challenge frozen token", function () {
        return fungibleToken.getBalance().then((balance) => {
            return fungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

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

    it("Mint - after unfreeze token", function () {
        let value = bigNumberify("100000000000000000000000000");
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: issuer.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(issuer.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Mint RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Transfer - after unfreeze token", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);
            return issuer.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: issuerFungibleToken.symbol,
                from: issuer.address,
                to: wallet.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return issuerFungibleToken.transfer(wallet.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - after unfreeze token", function () {
        return fungibleToken.getBalance().then((balance) => {
            balance = balance.div(2);
            return fungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Burn RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Freeze Account", function () {
        return token.FungibleToken.freezeFungibleTokenAccount(fungibleToken.symbol, issuer.address, provider).then((transaction) => {
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
        return token.FungibleToken.freezeFungibleTokenAccount(fungibleToken.symbol, issuer.address, provider).then((transaction) => {
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
        return token.FungibleToken.fromSymbol(symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
            if (!silent) console.log(indent, "Frozen Account Status:", JSON.stringify(issuerFungibleToken.accountState));
        });
    });

    it("Mint - challenge frozen account", function () {
        let value = bigNumberify("100000000000000000000000000");
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: wallet.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(wallet.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Transfer - challenge frozen sender account", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            return issuer.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: issuerFungibleToken.symbol,
                from: issuer.address,
                to: wallet.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return issuerFungibleToken.transfer(wallet.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    expect(receipt.status).to.equal(0);
                }).catch(error => {
                    expect(error.code).to.equal(errors.NOT_ALLOWED);
                });
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Transfer - challenge frozen receiver account", function () {
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

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - challenge frozen account", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            return issuerFungibleToken.burn(balance).then((receipt) => {
                expect(receipt).to.exist;
                expect(receipt.status).to.equal(0);
            }).catch(error => {
                expect(error.code).to.equal(errors.NOT_ALLOWED);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Unfreeze Account", function () {
        return token.FungibleToken.unfreezeFungibleTokenAccount(fungibleToken.symbol, issuer.address, provider).then((transaction) => {
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
        return token.FungibleToken.unfreezeFungibleTokenAccount(fungibleToken.symbol, issuer.address, provider).then((transaction) => {
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
        let symbol = issuerFungibleToken.symbol;
        return token.FungibleToken.fromSymbol(symbol, issuer).then((token) => {
            expect(token).to.exist;
            issuerFungibleToken = token;
            if (!silent) console.log(indent, "Unfreeze Account Status:", JSON.stringify(issuerFungibleToken.accountState));
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Mint - after unfreeze account", function () {
        let value = bigNumberify("25000000000000000000000000");
        return issuer.provider.getTransactionFee("token", "token-mintFungibleToken", {
            symbol: issuerFungibleToken.symbol,
            to: issuer.address,
            value: value.toString(),
            owner: issuer.address,
            memo: "Hello blockchain"
        }).then((fee) => {
            return issuerFungibleToken.mint(issuer.address, value, { fee }).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Mint RECEIPT:", JSON.stringify(receipt));
                expect(receipt.status).to.equal(1);
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Transfer - after unfreeze account", function () {
        return issuerFungibleToken.getBalance().then((balance) => {
            return issuer.provider.getTransactionFee("token", "token-transferFungibleToken", {
                symbol: issuerFungibleToken.symbol,
                from: issuer.address,
                to: issuer.address,
                value: balance,
                memo: "Hello blockchain"
            }).then((fee) => {
                return issuerFungibleToken.transfer(issuer.address, balance, { fee }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Transfer RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });

    if (!silent) {
        it("State", function () {
            return issuerFungibleToken.getState().then(() => {
                return issuerFungibleToken.getBalance();
            }).then(() => {
                return fungibleToken.getBalance().then(() => {
                    if (!silent) console.log(indent, "=====================================================");
                    if (!silent) console.log(indent, "STATE:", JSON.stringify(numberStringify(issuerFungibleToken.state)));
                    if (!silent) console.log(indent, "ACCOUNT STATE:", JSON.stringify(numberStringify(fungibleToken.accountState)));
                    if (!silent) console.log(indent, "ISSUER ACCOUNT STATE:", JSON.stringify(numberStringify(issuerFungibleToken.accountState)));
                    if (!silent) console.log(indent, "=====================================================");
                });
            });
        });
    }

    it("Burn - after unfreeze account", function () {
        return issuerFungibleToken.getState().then(() => {
            return issuerFungibleToken.getBalance().then((balance) => {
                return issuerFungibleToken.burn(balance).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "Burn RECEIPT:", JSON.stringify(receipt));
                    expect(receipt.status).to.equal(1);
                });
            });
        });
    });
});

describe('Suite: FungibleToken - Dynamic Supply - Limited (Reject)', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        fungibleTokenProperties = {
            name: "MY DYN " + hexlify(randomBytes(4)).substring(2),
            symbol: "DYN" + hexlify(randomBytes(4)).substring(2),
            decimals: 18,
            fixedSupply: false,
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

describe('Suite: FungibleToken - Dynamic Supply - Limited', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Clean up", function () {
        providerConnection.removeAllListeners("rpc");
    });
});

function numberStringify(obj) {
    return iterate(obj, function (key, value, type) {
        switch (type) {
            case "Number":
            case "BigNumber":
                return value.toString();
        }
        return value;
    });
}
