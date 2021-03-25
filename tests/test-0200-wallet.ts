'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { progress, clearLine } from "./utils-mxw";
import { mxw, errors, wordlists, utils } from '../src.ts/index';
import { formatMxw, base64, toUtf8String, toUtf8Bytes } from "../src.ts/utils";
import { nodeProvider } from "./env";
import { populateTransaction } from '../src.ts/utils/transaction';

let indent = "     ";
let silent = true;
let silentRpc = true;
let slowThreshold = 9000;

let providerConnection: mxw.providers.Provider;
let wallet: mxw.Wallet;
let wallet1: mxw.Wallet;
let wallet2: mxw.Wallet;
let wallet3: mxw.Wallet;
let walletAirDrop: mxw.Wallet;

let encryptedWallets: Array<string> = [];

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

if ("" != nodeProvider.kyc.middleware) {
    describe('Suite: Wallet', function () {
        this.slow(slowThreshold); // define the threshold for slow indicator

        if (silent) { silent = nodeProvider.trace.silent; }
        if (silentRpc) { silentRpc = nodeProvider.trace.silentRpc; }

        it("CreateRandom", function () {
            wallet2 = mxw.Wallet.createRandom({
                locale: wordlists.en
            });
            expect(wallet2).to.exist;
            if (!silent) console.log(indent, "Wallet 2:", JSON.stringify(wallet2));

            wallet3 = mxw.Wallet.createRandom({
                locale: wordlists.en
            });
            expect(wallet3).to.exist;
            if (!silent) console.log(indent, "Wallet 3:", JSON.stringify(wallet3));
        });

        it("CreateRandom with different number of words", function () {
            for (let n = 16; 32 >= n; n += 4) {
                let wallet = mxw.Wallet.createRandom({
                    entropyLength: n
                });
                expect(wallet).to.exist;

                let anotherWallet = mxw.Wallet.fromMnemonic(wallet.mnemonic);
                expect(anotherWallet).to.exist;
                expect(anotherWallet.address).to.equal(wallet.address);

                if (!silent) {
                    let words = wordlists.en.split(wallet.mnemonic);
                    console.log(indent, words.length, "words:", wallet.mnemonic);
                }
            }
        });

        it("CreateRandom with multi languages", function () {
            for (let language of Object.keys(wordlists.locales)) {
                wallet = mxw.Wallet.createRandom({
                    locale: wordlists.locales[language]
                });
                expect(wallet).to.exist;
                if (!silent) console.log(indent, "Wallet -", language, ":", wallet.mnemonic);
            }
        });

        it("CreateRandom with multi languages and different number of words", function () {
            for (let language of Object.keys(wordlists.locales)) {
                for (let n = 16; 32 >= n; n += 4) {
                    let wallet = mxw.Wallet.createRandom({
                        locale: wordlists.locales[language],
                        entropyLength: n
                    });
                    expect(wallet).to.exist;

                    let anotherWallet = mxw.Wallet.fromMnemonic(wallet.mnemonic, null, wordlists.locales[language]);
                    expect(anotherWallet).to.exist;
                    expect(anotherWallet.address).to.equal(wallet.address);

                    if (!silent) {
                        let words = wordlists.locales[language].split(wallet.mnemonic);
                        console.log(indent, words.length, language, ":", wallet.mnemonic);
                    }
                }
                if (!silent) console.log();
            }
        });

        it("Create from mnemonic", function () {
            wallet1 = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer);
            expect(wallet1).to.exist;
            if (!silent) console.log(indent, "Wallet:", JSON.stringify(wallet1));

            walletAirDrop = mxw.Wallet.fromMnemonic(nodeProvider.airDrop);
        });

        it("Create from mnemonic with multi languages and different number of words and different path", function () {
            for (let language of Object.keys(wordlists.locales)) {
                for (let n = 16; 32 >= n; n += 4) {
                    for (let i = 0; 10 > i; i++) {
                        let path = "m/44'/376'/0'/0/" + i;
                        let wallet = mxw.Wallet.createRandom({
                            locale: wordlists.locales[language],
                            entropyLength: n,
                            path
                        });
                        expect(wallet).to.exist;

                        let anotherWallet = mxw.Wallet.fromMnemonic(wallet.mnemonic, path, wordlists.locales[language]);
                        // expect(anotherWallet).to.exist;
                        expect(anotherWallet.address).to.equal(wallet.address);

                        if (!silent) {
                            let words = wordlists.locales[language].split(wallet.mnemonic);
                            let message = words.length + " " + language + ": " + wallet.mnemonic;
                            clearLine();
                            progress(i, null, message, 0);
                        }
                    }
                }
                if (!silent) console.log();
            }
        });

        it("Connect with JSON RPC provider", function () {
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

            wallet1 = wallet1.connect(providerConnection);
            expect(wallet1).to.exist;

            wallet2 = wallet2.connect(providerConnection);
            expect(wallet2).to.exist;

            wallet3 = wallet3.connect(providerConnection);
            expect(wallet3).to.exist;

            walletAirDrop = walletAirDrop.connect(providerConnection);
            expect(walletAirDrop).to.exist;

            wallet = wallet1;
        });

        it("Lookup address", function () {
            return wallet.provider.lookupAddress(wallet.address).then((name) => {
                if (!silent) console.log(indent, "provider.lookupAddress:", name ? name : "<NOT SET>");
            });
        });

        it("Transfer", function () {
            let value = mxw.utils.parseMxw("100");
            let overrides = {
                logSignaturePayload: defaultOverrides.logSignaturePayload,
                logSignedTransaction: defaultOverrides.logSignedTransaction,
                memo: "Hello Blockchain!"
            }
            return wallet.provider.getTransactionFee("bank", "bank-send", {
                from: wallet.address,
                to: walletAirDrop.address,
                value,
                memo: overrides.memo
            }).then((fee) => {
                overrides["fee"] = fee;
                return wallet.transfer(walletAirDrop.address, value, overrides).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
                });
            });
        });

        it("AirDrop transfer with zero fee", function () {
            let value = mxw.utils.parseMxw("100");
            let overrides = {
                logSignaturePayload: defaultOverrides.logSignaturePayload,
                logSignedTransaction: defaultOverrides.logSignedTransaction,
                memo: "Hello Blockchain!"
            }
            return walletAirDrop.provider.getTransactionFee("bank", "bank-send", {
                from: walletAirDrop.address,
                to: wallet.address,
                value,
                memo: overrides.memo
            }).then((fee) => {
                expect(fee.amount[0].amount.eq(0)).to.be.true;
                overrides["fee"] = fee;
                return walletAirDrop.transfer(wallet.address, value, overrides).then((receipt) => {
                    expect(receipt).to.exist;
                    expect(receipt.payload.value.fee.amount[0].amount).to.equal("0");
                    if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
                });
            });
        });

        it("Transfer with manual broadcast", function () {
            let value = mxw.utils.parseMxw("100");
            let overrides = {
                logSignaturePayload: defaultOverrides.logSignaturePayload,
                logSignedTransaction: defaultOverrides.logSignedTransaction,
                memo: "Hello Blockchain!"
            }
            return wallet.provider.getTransactionFee("bank", "bank-send", {
                from: wallet.address,
                to: walletAirDrop.address,
                value,
                memo: overrides.memo
            }).then((fee) => {
                overrides["fee"] = fee;
                return wallet.getTransferTransactionRequest(walletAirDrop.address, value, overrides).then((tx) => {
                    return wallet.sign(tx, overrides);
                }).then((signedTransaction) => {
                    return providerConnection.sendTransaction(signedTransaction, overrides);
                }).then((response) => {
                    return providerConnection.waitForTransaction(response.hash);
                }).then((receipt) => {
                    expect(receipt).to.exist;
                    if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
                });
            });
        });

        it("Transfer but not enough balance for fee", function () {
            return walletAirDrop.getBalance().then((balance) => {
                expect(balance).to.exist;
                let value = balance;
                let overrides = {
                    logSignaturePayload: defaultOverrides.logSignaturePayload,
                    logSignedTransaction: defaultOverrides.logSignedTransaction,
                    memo: "Believe me I have enough balance"
                }
                return walletAirDrop.provider.getTransactionFee("bank", "bank-send", {
                    from: wallet.address,
                    to: walletAirDrop.address,
                    value,
                    memo: overrides.memo
                }).then((fee) => {
                    overrides["fee"] = fee;
                    return walletAirDrop.transfer(wallet.address, value, overrides).then((receipt) => {
                        expect(receipt).to.exist;
                        expect(receipt.status).to.equal(0);
                    }).catch(error => {
                        expect(error.code).to.equal(errors.INSUFFICIENT_FUNDS);
                    });
                });
            });
        });

        it("Get account number", function () {
            return wallet.getAccountNumber().then((accountNumber) => {
                expect(accountNumber).to.exist;
                if (!silent) console.log(indent, "AccountNumber:", accountNumber.toString(), "(" + wallet.address + ")");
            });
        });

        it("Get balance", function () {
            return wallet.getBalance().then((balance) => {
                expect(balance).to.exist;
                if (!silent) console.log(indent, "Balance:", formatMxw(balance), "(" + wallet.address + ")");
            });
        });

        it("Get transaction count (nonce)", function () {
            return wallet.getTransactionCount().then((nonce) => {
                expect(nonce).to.exist;
                if (!silent) console.log(indent, "Nonce:", nonce.toString(), "(" + wallet.address + ")");
            });
        });

        it("Sign message", function () {
            let message = "ANY STRING HERE";

            return wallet.signMessage(message).then((signature) => {
                expect(signature).to.exist;
                signature = base64.encode(signature);

                let valid = mxw.utils.verify(message, signature, wallet.address);
                expect(true).to.equal(valid);
            });
        });

        it("Sign transaction", function () {
            let value = mxw.utils.parseMxw("100");

            return walletAirDrop.provider.getTransactionFee("bank", "bank-send", {
                from: wallet.address,
                to: walletAirDrop.address,
                value
            }).then((fee) => {
                let transaction = wallet.provider.getTransactionRequest("bank", "bank-send", {
                    from: wallet.address,
                    to: walletAirDrop.address,
                    value,
                    fee
                });

                return wallet.sign(transaction).then((signedTransaction) => {
                    expect(signedTransaction).to.exist;
                    if (!silent) console.log(indent, "SignedTransaction:", signedTransaction);
                });
            });
        });

        it("Sign transaction with anonymous attributes", function () {
            let value = mxw.utils.parseMxw("100");
            let overrides = {
                logSignaturePayload: defaultOverrides.logSignaturePayload,
                logSignedTransaction: defaultOverrides.logSignedTransaction,
                memo: "Hello Blockchain!"
            }

            return walletAirDrop.provider.getTransactionFee("bank", "bank-send", {
                from: wallet.address,
                to: walletAirDrop.address,
                value,
                memo: overrides.memo
            }).then((fee) => {
                let transaction = wallet.provider.getTransactionRequest("bank", "bank-send", {
                    from: wallet.address,
                    to: walletAirDrop.address,
                    value,
                    fee,
                    memo: overrides.memo
                });
                transaction.fee = fee;
                return populateTransaction(transaction, wallet.provider, wallet.address);
            }).then((transaction) => {
                return wallet.sign(transaction).then((signedTransaction) => {
                    let tx = JSON.parse(toUtf8String(base64.decode(signedTransaction)));
                    if (!silent) console.log(indent, "Transaction:", JSON.stringify(tx));

                    // Inject anonymous attributes after signed to avoid invalid signature
                    tx.value.msg[0].value["invisible"] = "I am invisible";
                    signedTransaction = base64.encode(toUtf8Bytes(JSON.stringify(tx)));

                    return wallet.provider.sendTransaction(signedTransaction, overrides);
                }).then((response) => {
                    expect(response).to.exist;
                    expect(response.hash).to.exist;
                    if (!silent) console.log(indent, "Response:", JSON.stringify(response));

                    return wallet.provider.waitForTransaction(response.hash).then((receipt) => {
                        expect(receipt).to.exist;
                        expect(receipt.status).to.equal(1);
                        expect(receipt.payload.value.msg[0].value["invisible"]).to.not.exist;
                        if (!silent) console.log(indent, "Receipt:", JSON.stringify(receipt));
                    });
                });
            });
        });

        it("Clean up RPC listener", function () {
            providerConnection.removeAllListeners();
        });

        it("Encrypt wallet with multi-language", function () {
            this.slow(15000);

            if (!silent) console.log(indent, "Encrypt wallet with", Object.keys(wordlists.locales).length, "languages");
            let promises = Promise.resolve();
            for (let locale of Object.keys(wordlists.locales)) {
                let wallet = mxw.Wallet.createRandom({ locale: wordlists.locales[locale] });
                expect(wallet).to.exist;

                let counter = 0;
                let progressCallback = (percentage) => {
                    percentage = (percentage * 100).toFixed(0);
                    if (!silent) progress(++counter, percentage, "Encrypting (" + locale + "): " + wallet.mnemonic, 6);
                };
                promises = promises.then(() => {
                    return wallet.encrypt("any strong password", progressCallback).then((encrypted) => {
                        expect(encrypted).to.exist;
                        encryptedWallets.push(encrypted);
                        if (!silent) progress(0, 100, "Encrypted wallet (" + locale + "): " + wallet.mnemonic + " - " + encrypted, 6);
                        if (!silent) console.log("");
                    });
                })
            }
            return promises;
        });

        it("Decrypt wallet with multi-language", function () {
            this.slow(15000);

            if (!silent) console.log(indent, "Decrypt wallet with", encryptedWallets.length, "languages");
            let promises = Promise.resolve();
            for (let encryptedWallet of encryptedWallets) {
                let counter = 0;
                let progressCallback = (percentage) => {
                    percentage = (percentage * 100).toFixed(0);
                    if (!silent) progress(++counter, percentage, "Decrypting...", 6);
                };
                promises = promises.then(() => {
                    return mxw.Wallet.fromEncryptedJson(encryptedWallet, "any strong password", progressCallback).then((wallet) => {
                        expect(wallet).to.exist;
                        if (!silent) progress(0, 100, "Decrypted wallet (" + wallet.wordlist.locale + "): " + wallet.mnemonic, 6);
                        if (!silent) console.log("");
                    });
                });
            }
            return promises;
        });

        it("Load encrypted wallet format v0.1", function () {
            let encryptedWallet = '{"address":"mxw1m5qg7swt85y7h90evp75h48ah7kq4d9qnshlg5","id":"9fb5b452-5d8e-4f21-b86c-36c8fb89a6ee","version":3,"Crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"6225d04b84258963be446d6f2827c083"},"ciphertext":"ba4ab50b3811700eb13a6ce20210b14b7e3570e07b46add6b254c6f81e04b044","kdf":"scrypt","kdfparams":{"salt":"3a1cba8bd23170d41193da67682484cdd5afc639a7359dd119794d8c577e9a6f","n":131072,"dklen":32,"p":1,"r":8},"mac":"ac78dd013c91dfaf905f2185401f4bf9fd132d1fa5fbbb729e822e761bfaa2ec"},"x-mxw":{"client":"mxw-sdk","filename":"UTC--2020-07-19T17-25-11.0Z--mxw1m5qg7swt85y7h90evp75h48ah7kq4d9qnshlg5","mnemonicCounter":"1cfaee39612c2f4361f52c2fbfcd8ab0","mnemonicCiphertext":"b495932d586c6de3d8dde92f74416218","path":"m/44\'/376\'/0\'/0/0","version":"0.1"}}';

            return mxw.Wallet.fromEncryptedJson(encryptedWallet, "any strong password").then((wallet) => {
                expect(wallet).is.exist;
                expect(wallet).has.property("address").is.eq("mxw1m5qg7swt85y7h90evp75h48ah7kq4d9qnshlg5");
                expect(wallet).has.property("mnemonic").is.eq("ask cliff eyebrow sound age lottery initial casual choose book pudding invest");
            });
        });

        it("Load encrypted wallet format v0.2", function () {
            let encryptedWallet = '{"address":"mxw155uygslajet0ppga72vgah36kryuta6wr9233g","id":"c222613a-4058-46cb-9a2e-d73f0a3b4320","version":3,"Crypto":{"cipher":"aes-256-ctr","cipherparams":{"iv":"b53f720ded76b0cf156ccdeb9de52501"},"ciphertext":"7b93e5ae431c75bf3ccc103f657864c1cbc884bf51979e62c18b159270fcc25f","kdf":"scrypt","kdfparams":{"salt":"16015290370acbaba7bca00a5116414d9d0380b10e0b3f69e13222fbce7656a6","n":131072,"dklen":48,"p":1,"r":8},"mac":"d93a0277d435b419c5d0dbd6cef5d78f6b8bd8147e4739d3408a9a6c41b16470"},"x-mxw":{"client":"mxw-sdk","filename":"UTC--2020-07-19T17-42-56.0Z--mxw155uygslajet0ppga72vgah36kryuta6wr9233g","mnemonicCounter":"ed455dd20df0968174b9dd0103589e72","mnemonicCiphertext":"07f561c571747588ce803b7496519382","path":"m/44\'/376\'/0\'/0/0","locale":"en","version":"0.1"}}';

            return mxw.Wallet.fromEncryptedJson(encryptedWallet, "any strong password").then((wallet) => {
                expect(wallet).is.exist;
                expect(wallet).has.property("address").is.eq("mxw155uygslajet0ppga72vgah36kryuta6wr9233g");
                expect(wallet).has.property("mnemonic").is.eq("what bike cactus chalk hole height skill lava owner student festival trap");
            });
        });

        it("Compute shared secret", function () {
            let secret1With2 = wallet1.computeSharedSecret(wallet2.publicKey);
            let secret2With1 = wallet2.computeSharedSecret(wallet1.publicKey);

            if (!silent) console.log(indent, "Shared secret wallet 1 with 2:", secret1With2);
            if (!silent) console.log(indent, "Shared secret wallet 2 with 1:", secret2With1);

            if (!silent) console.log(indent, utils.computeAddress(wallet1.publicKey), "publicKey:", wallet1.publicKey);
            if (!silent) console.log(indent, utils.computeAddress(wallet2.publicKey), "publicKey:", wallet2.publicKey);

            expect(secret1With2).to.equal(secret2With1);
        });

        it("Verify mnemonic", function () {
            let wallet = mxw.Wallet.fromMnemonic("lady rebel cash silent object vault peace deal forward problem guide number");
            expect("mxw1lgaaw7r5nw49d70vgm79k9hjjdpcrhqgum0vmm").to.equal(wallet.address);
        });

    });
}
