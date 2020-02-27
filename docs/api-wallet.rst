.. |nbsp| unicode:: U+00A0 .. non-breaking space
.. container:: hatnote hatnote-gray

    Testing

.. _api-wallet:

*******
Wallets
*******

A **Wallet** manages a private/public key pair which is used to cryptographically sign
transactions and prove ownership on the blockchain network.

-----

.. _wallet:

Wallet
######

The **Wallet** implements the :ref:`Signer API <signer>` and can be used anywhere a *Signer*
is expected and has all the required properties.

Create Wallet
*************

:sup:`Wallet` . createRandom ( [ options ] ) |nbsp| `=> Wallet`
    | Creates a new random wallet then generate mnemonic and an encrypted JSON file.
    | Ensure this wallet is stored somewhere safe, if lost there is **NO way to recover it**. 

    | Parameters can be use are:-
    
        - **entropyLength :** *int* (from 16 to 32 & mutiple of 4 - higher value means greater security)
        - **path :** *string* (directory to store mnemonic)
        - **locale :** *string* (worldlists)

        The current supported wordlists are:

    ===================== ===========================
    Language              node.js                    
    ===================== ===========================
    English (US)          ``wordlists.en`` 
    Spanish               ``wordlists.es``  
    France                ``wordlists.fr``        
    Italian               ``wordlists.it``           
    Japanese              ``wordlists.ja``           
    Korean                ``wordlists.ko``           
    Chinese (simplified)  ``wordlists.zh_cn``        
    Chinese (traditional) ``wordlists.zh_tw``        
    ===================== ===========================

.. code-block:: javascript
    :caption: *create a new wallet using random generated private key*

    let randomWallet = mxw.Wallet.createRandom();
    //By default, the wallet is created by 16 hexadecimal digits private key, 
    //and will generate mnemonic using wordlists.en

.. code-block:: javascript
    :caption: *create a new wallet randomly with specified private key length*

    // Create a wallet using 24 hexadecimal digits
    let randomWallet = mxw.Wallet.createRandom({
        entropyLength: 24
    });

.. code-block:: javascript
    :caption: *create a new wallet randomly and generate mnemonic using different wordlist*

    // Create a wallet uand generate mnemonic using worldlists.zh
    let randomWallet = mxw.Wallet.createRandom({
        locale: mxw.wordlists.zh
    });
    console.log("Mnemonic:", randomWallet.mnemonic);

Create Instance of Existing Wallet
**********************************

new :sup:`Wallet` ( privateKey [ , provider ] )
    Creating a new instance of exisiting wallet from *privateKey* and optionally connect a provider

.. code-block:: javascript
    :caption: *load wallet using private key and connect it to provider*

    //connect wallet to testnet
    let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let provider = mxw.getDefaultProvider("testnet");
    let walletWithProvider = new mxw.Wallet(privateKey, provider);

.. _wallet-connect:

:sup:`prototype` . connect ( provider ) |nbsp| `=> Wallet`
    Creates a new Wallet instance from an existing instance, connected to a new *provider*.

.. code-block:: javascript
    :caption: *load wallet using private key then connect to provider*

    //load wallet using private key
    let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let wallet = new mxw.Wallet(privateKey);

    // Connect the wallet to testnet
    let provider = mxw.getDefaultProvider("testnet");
    wallet.connect(provider);

.. _fromEncryptedJson:

:sup:`Wallet` . fromEncryptedJson ( json, password [ , progressCallback ] ) |nbsp| `=> Wallet`
    Creating a new instance of exisiting wallet by decrypt an encrypted Secret Storage `JSON Wallet`_ (from created using *prototype.encrypt* )

.. code-block:: javascript
    :caption: *load wallet using an encrypted JSON*

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


:sup:`Wallet` . fromMnemonic ( mnemonic [ , path :sup:`= "m/44'/376'/0'/0/0"` [ , wordlist ] ] ) |nbsp| `=> Wallet`
    Generate a `BIP-039`_ + `BIP-044`_ wallet from *mnemonic* deriving *path* using
    the *wordlist*. The default language is English (en).

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

.. _addressOrName:

Prototype Variables
###################

:sup:`prototype` . address
    | Returns public address of a wallet
    | *data type: string*

:sup:`prototype` . privateKey
    | Returns private key of a wallet; always keep this secret
    | *data type: hex string*

:sup:`prototype` . provider
    Returns a connected :ref:`Provider <provider>` which allows the wallet to
    connect to the blockchain network to query its state and send transactions, 
    or null if no provider is connected.

    To change the provider, use the :ref:`connect <wallet-connect>` method, which will returns
    a **new instance** of the Wallet connected to the provider.  
    | *data type: string*

:sup:`prototype` . mnemonic
    | Returns mnemonic phrase for this wallet, or null if the mnemonic is unknown.
    | *data type: string*

:sup:`prototype` . path
    | Returns mnemonic path for this wallet, or null if the mnemonic is unknown.
    | *data type: string* 

-----


.. _BIP-039: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
.. _BIP-044: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
.. _JSON Wallet: https://medium.com/@julien.maffre/what-is-an-ethereum-keystore-file-86c8c5917b97
.. EOF