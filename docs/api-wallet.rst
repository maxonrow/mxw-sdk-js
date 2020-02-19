.. |nbsp| unicode:: U+00A0 .. non-breaking space
.. container:: hatnote hatnote-gray

    Testing

.. _api-wallet:

Wallets and Signers
*******************

A **Wallet** manages a private/public key pair which is used to cryptographically sign
transactions and prove ownership on the blockchain network.

-----

.. _wallet:

Wallet
======

The **Wallet** implements the :ref:`Signer API <signer>` and can be used anywhere a *Signer*
is expected and has all the required properties.

Creating Instances
------------------

new :sup:`Wallet` ( privateKey [ , provider ] )
    Creates a new instance from *privateKey* and optionally connect a provider

:sup:`Wallet` . createRandom ( [ options ] ) |nbsp| `=> Wallet`
    Creates a new random wallet. Ensure this wallet is stored somewhere safe, if
    lost there is **NO way to recover it**.

    Options may have the properties:

        - **extraEntropy** --- additional entropy to stir into the random source

.. _fromEncryptedJson:

:sup:`Wallet` . fromEncryptedJson ( json, password [ , progressCallback ] ) |nbsp| `=> Wallet`
    Decrypt an encrypted Secret Storage `JSON Wallet`_ (from created using *prototype.encrypt* )

:sup:`Wallet` . fromMnemonic ( mnemonic [ , path :sup:`= "m/44'/376'/0'/0/0"` [ , wordlist ] ] ) |nbsp| `=> Wallet`
    Generate a `BIP-039`_ + `BIP-044`_ wallet from *mnemonic* deriving *path* using
    the *wordlist*. The default language is English (en).

    The current supported wordlists are:

    ===================== ===========================
    Language              node.js                    
    ===================== ===========================
    English (US)          ``wordlists.en``   
    France                ``worldlist.fr``        
    Italian               ``wordlists.it``           
    Japanese              ``wordlists.ja``           
    Korean                ``wordlists.ko``           
    Chinese (simplified)  ``wordlists.zh_cn``        
    Chinese (traditional) ``wordlists.zh_tw``        
    ===================== ===========================

.. _wallet-connect:

:sup:`prototype` . connect ( provider ) |nbsp| `=> Wallet`
    Creates a new Wallet instance from an existing instance, connected to a new *provider*.


.. code-block:: javascript
    :caption: *load wallet using private key*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey);

    // Connect a wallet to mainnet
    let provider = mxw.getDefaultProvider();
    let walletWithProvider = new mxw.Wallet(privateKey, provider);


.. code-block:: javascript
    :caption: *create a new random account*

    let randomWallet = mxw.Wallet.createRandom();


.. code-block:: javascript
    :caption: *create a new random account with chinese mnemonic*

    let randomWallet = mxw.Wallet.createRandom({
        locale: mxw.wordlists.zh
    });
    console.log("Mnemonic:", randomWallet.mnemonic);


.. code-block:: javascript
    :caption: *load an encrypted JSON wallet*

    let data = {
        address: "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
        id: "0a462eb4-939d-4d05-acb1-f7827f758e3c",
        version: 3,
        Crypto: {
            cipher: "aes-128-ctr",
            cipherparams: {
                iv: "ff1e5fd9e71497a11e2923e7a2496bb9"
            },
            ciphertext: "6caeb28cf0687c9c84d5f02dab1afe3f27fb85483f90538ca59d299c5f2d426f",
            kdf: "scrypt",
            kdfparams: {
                salt: "8e8462bc7808066ba66d85fb85111906665b04b2320b5e7ac615d81e4f0641b5",
                n: 131072,
                dklen: 32,
                p: 1,
                r: 8
            },
            mac: "b7927c99583d62ec2426220fc5b65872aa89183227def48fd7b150b566c12142"
        },
        x-mxw: {
            client: "mxw-sdk",
            filename: "UTC--2019-07-25T16-24-39.0Z--mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
            mnemonicCounter: "0de98c10a68756d8d7c51f4460f9d2cb",
            mnemonicCiphertext: "a31bb80eecb99a44eddbb53897e74f38",
            path: "m/44'/376'/0'/0/0",
            version: "0.1"
        }
    };

    let json = JSON.stringify(data);
    let password = "any strong password";

    mxw.Wallet.fromEncryptedJson(json, password).then((wallet) => {
        console.log("Wallet: " + JSON.stringify(wallet, null, 4));
        // Wallet Address should be "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x"
    });


.. code-block:: javascript
    :caption: *load a wallet using mnemonic phrase*

    let mnemonic = "legal grain canyon open antenna flame destroy nature fall pistol mushroom stay";
    let mnemonicWallet = mxw.Wallet.fromMnemonic(mnemonic);
    console.log("mnemonicWallet: " + JSON.stringify(mnemonicWallet, null, 4));
    // Wallet Address should be "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x"

    // Load the second account from a mnemonic
    let path = "m/44'/376'/1'/0/0";
    let secondMnemonicWallet = mxw.Wallet.fromMnemonic(mnemonic, path);
    console.log("secondMnemonicWallet: " + JSON.stringify(secondMnemonicWallet, null, 4));
    // Wallet Address should be "mxw1lgz72w89amz76vrnl3mgfj4p9jls7eggts0pag"

    // Load using a non-english locale wordlist (the path "null" will use the default)
    let zhMnemonic = "手 农 勾 讲 嫂 蒋 借 棚 遗 没 紫 雾";
    let zhMnemonicWallet = mxw.Wallet.fromMnemonic(zhMnemonic, null, mxw.wordlists.zh);
    console.log("zhMnemonicWallet: " + JSON.stringify(zhMnemonicWallet, null, 4));
    // Wallet Address should be "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae"


-----

Prototype
---------

:sup:`prototype` . address
    The public address of a wallet

:sup:`prototype` . privateKey
    The private key of a wallet; keep this secret

:sup:`prototype` . provider
    A connected :ref:`Provider <provider>` which allows the wallet to
    connect to the blockchain network to query its state and send transactions,
    or null if no provider is connected.

    To change the provider, use the :ref:`connect <wallet-connect>` method, which will return
    a **new instance** of the Wallet connected to the provider.

:sup:`prototype` . mnemonic
    The mnemonic phrase for this wallet, or null if the mnemonic is unknown.

:sup:`prototype` . path
    The mnemonic path for this wallet, or null if the mnemonic is unknown.

-----

Signing
-------

:sup:`prototype` . sign ( transaction ) |nbsp| `=> Promise<string>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the signed transaction as a :ref:`hex string <hexstring>`.

    In general, the `sendTransaction`_ method is preferred to ``sign``, as it can automatically
    populate values asynchronously.

.. code-block:: javascript
    :caption: *the properties for transaction are all optional and include:*

    type?: string,
    value?: {
        msg?: [{ type: string, value: any }],
        fee?: {
            amount?: [{ denom: string, amount: BigNumberish }],
            gas: BigNumberish
        },
        memo?: string
    }


:sup:`prototype` . signMessage ( message ) |nbsp| `=> Promise<string>`
    Signs *message* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`flat-format <signature>` signature.

    If *message* is a string, it is converted to UTF-8 bytes, otherwise it is
    preserved as a binary representation of the :ref:`Arrayish <arrayish>` data.

.. code-block:: javascript
    :caption: *signing transactions*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let provider = mxw.getDefaultProvider();
    let wallet = new mxw.Wallet(privateKey, provider);

    console.log(wallet.address);
    // "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x"

    let amount = mxw.utils.parseMxw("1.0");

    // All properties are optional, except fee
    let transaction = {
        type: "cosmos-sdk/StdTx",
        value: {
            msg: [
                {
                    type: "mxw/MsgSend",
                    value: {
                        amount: [
                            {
                                amount: amount,
                                denom: "cin",
                            },
                        ],
                        from_address: wallet.address,
                        to_address: "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae",
                    }
                }
            ],
            memo: "Hello Blockchain"
        },
        fee: provider.getTransactionFee("bank", "bank-send", null, amount)
    };

    return wallet.sign(transaction).then((signedTransaction) => {

        console.log(signedTransaction);
        // Should be base64 encoded string

        return provider.sendTransaction(signedTransaction).then((tx) => {

            console.log(tx);
            // Should be transaction response with transaction hash value

            // Query transaction receipt by transaction hash
            return provider.waitForTransaction(tx.hash).then((receipt) => {

                console.log(receipt);
                // Should check the transaction status = 1 means successfully added into block
            });
        });
    });


.. code-block:: javascript
    :caption: *signing text messages*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey);

    // Sign a text message
    return wallet.signMessage("Hello Blockchain!").then((signature) => {

        // Flat-format
        console.log(signature);
        // 0xc49045d2fd3f591c86b1c35ed90315f6b42791401854c5164461946c8f5fea98
        //   0229683de3459716cd7d1e5f9502811766a5eaf9c96c64c1625aaad815cdc3741c

        // Expanded-format
        console.log(mxw.utils.splitSignature(signature));
        // { 
        //     r: "0xc49045d2fd3f591c86b1c35ed90315f6b42791401854c5164461946c8f5fea98",
        //     s: "0x0229683de3459716cd7d1e5f9502811766a5eaf9c96c64c1625aaad815cdc374",
        //     v: 28,
        //     recoveryParam: 1
        // }
    });


.. code-block:: javascript
    :caption: *signing binary messages*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey);

    // The 66 character hex string MUST be converted to a 32-byte array first!
    let hash = "0x48656c6c6f20426c6f636b636861696e21";
    let binaryData = mxw.utils.arrayify(hash);

    return wallet.signMessage(binaryData).then((signature) => {

        console.log(signature);
        // "0xc49045d2fd3f591c86b1c35ed90315f6b42791401854c5164461946c8f5fea98
        //    0229683de3459716cd7d1e5f9502811766a5eaf9c96c64c1625aaad815cdc3741c

        let address = mxw.utils.verifyMessage(binaryData, signature);
        console.log(address);
        // Should be equal to signer wallet address mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x
    });


-----

Name Service
------------

:sup:`prototype` . createAlias ( name, appFee ) |nbsp| `=> Promise<TransactionReceipt>`
    Sign alias creation transaction and send it to network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Response <transaction-receipt>`. Alias application approval is required by authority.


    Note: The alias should not contains any spaces, special characters or any sensitive words.
    The application fee should be set according to the configured value.

-----

Cryptographic Functions
-----------------------

:sup:`prototype` . computeSharedSecret ( otherPublicKey ) |nbsp| `=> string`
    Compute the *shared secret* by using other wallet's public key and returns as a :ref:`hex string <hexstring>`.
    In general, the shared secret should not directly uses as encryption key. Instead of derive it using :ref:`pbkdf2 <pbkdf2>`.

-----

Blockchain Operations
---------------------

These operations require the wallet have a provider attached to it.

:sup:`prototype` . getBalance ( ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` that resolves to the balance (as a :ref:`BigNumber <bignumber>`,
    in **cin**) of the wallet. Be aware of the number of decimals for *cin* is 18.
    The balance can be convert to a human readable format by :ref:`formatMxw <formatMxw>`, versa :ref:`parseMxw <parseMxw>`.

:sup:`prototype` . transfer ( addressOrName, value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *transfer transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``addressOrName`` can be set to recipient alias or wallet address. The ``value`` is the number of *cin*
    (as a :ref:`BigNumber <bignumber>`) that transfers to recipient. Be aware of the number of decimals for *cin*
    is 18.

:sup:`prototype` . getTransactionCount ( ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` that resovles to the number of transactions
    this account has ever sent (as a :ref:`BigNumber <bignumber>`).

.. _sendTransaction:

:sup:`prototype` . sendTransaction ( transaction ) |nbsp| `=> Promise<TransactionResponse>`
    Sends the *transaction* (see :ref:`Transaction Requests <transaction-request>`) to
    the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Response <transaction-receipt>`. Any properties that are not
    provided will be populated from the network.

.. code-block:: javascript
    :caption: *query the network*

    // We require a provider to query the network
    let provider = mxw.getDefaultProvider();

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey, provider);

    wallet.getBalance().then((balance) => {
        console.log(balance);
    });

    wallet.getTransactionCount().then((nonce) => {
        console.log(nonce);
    });


.. code-block:: javascript
    :caption: *transfer mxw*

    // We require a provider to send transactions
    let provider = mxw.getDefaultProvider();

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey, provider);

    let to = "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae";
    // ... or supports Alias names
    // to: "jeansoon",

    let amount = mxw.utils.parseMxw("1.0");
    // We must pass in the amount as cin (1 mxw = 1e18 cin), so we
    // use this convenience function to convert mxw to cin.

    return wallet.transfer(to, amount).then((receipt) => {
        console.log(receipt);
        // Should check the transaction status = 1 means successfully added into block
    });


-----

Encrypted JSON Wallets
----------------------

Many systems store private keys as encrypted JSON wallets, in various formats. There are several
formats and algorithms that are used, all of which are supported to be read.
Only the secure scrypt variation can be generated.

See :ref:`Wallet.fromEncryptedJson <fromEncryptedJson>` for creating a
Wallet instance from a JSON wallet.

:sup:`prototype` . encrypt ( password [ , options [ , progressCallback ] ] ) |nbsp| `=> Promise<string>`
    Encrypts the wallet as an encrypted JSON wallet, with the *password*.

    All options are optional. The valid options are:

        - **salt** --- the salt to use for scrypt
        - **iv** --- the initialization vecotr to use for aes-ctr-128
        - **uuid** --- the UUID to use for the wallet
        - **scrypt** --- the scrypt parameters to use (N, r and p)
        - **entropy** --- the mnemonic entropy of this wallet; generally you should **not** specify this
        - **mnemonic** --- the mnemonic phrase of this wallet; generally you should **not** specify this
        - **path** --- the mnemonic path of this wallet; generally you should **not** specify this

    If the *progressCallback* is specified, it will be called periodically during
    encryption with a value between 0 and 1, inclusive indicating the progress.


.. code-block:: javascript
    :caption: *encrypt a wallet as an encrypted JSON wallet*

    let password = "any strong password";

    function callback(progress) {
        console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
    }

    return wallet.encrypt(password, callback).then((json) => {
        console.log(json);
    });


-----

.. _signer:

Signer API
==========

The Signer API is an abstract class which makes it easy to extend and add new signers,
that can be used by this library and extension libraries. The :ref:`Wallet <wallet>`
extends the Signer API.

To implement a Signer, inherit the abstract class *mxw.types.Signer* and implement
the following properties:

:sup:`object` . provider
    A :ref:`Provider <api-provider>` that is connected to the network. This is optional, however,
    without a *provider*, **only** *write-only* operations should be expected to work.

:sup:`object` . getAddress ( ) |nbsp| `=> Promise<Address>`
    Returns a :ref:`Promise <promise>` that resolves to the account address.

:sup:`object` . signMessage ( message ) |nbsp| `=> Promise<hex>`
    Returns a :ref:`Promise <promise>` that resolves to the :ref:`Flat-Format Signature <signature>`
    for the *message*.

    If *message* is a string, it is converted to UTF-8 bytes, otherwise it is
    preserved as a binary representation of the :ref:`Arrayish <arrayish>` data.

:sup:`object` . sign ( transaction ) |nbsp| `=> Promise<hex>`
    Returns a :ref:`Promise <promise>` that resolves to the *signed* transaction that ready to send to the network.

:sup:`object` . sendTransaction ( transaction ) |nbsp| `=> Promise<TransactionResponse>`
    Sends the *transaction* (see :ref:`Transaction Requests <transaction-request>`) to
    the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Response <transaction-receipt>`. Any properties that are not
    provided will be populated from the network.

-----

.. _BIP-039: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
.. _BIP-044: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
.. _JSON Wallet: https://medium.com/@julien.maffre/what-is-an-ethereum-keystore-file-86c8c5917b97
.. EOF