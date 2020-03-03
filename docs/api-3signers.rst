.. |nbsp| unicode:: U+00A0 .. non-breaking space

*******
Signers
*******

Signer is required in a transaction, it is to add a layer of security. Ensure no one can manipulate other's wallet 

Signing
#######

:sup:`prototype` . signMessage ( message ) |nbsp| `=> Promise<string>`
    Signs *message* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`flat-format <signature>` signature.

    If *message* is a string, it is converted to UTF-8 bytes, otherwise it is
    preserved as a binary representation of the :ref:`Arrayish <arrayish>` data.

.. code-block:: javascript
    :caption: *signing text messages*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey);

    // Sign a text message
    return wallet.signMessage("Hello Blockchain!").then((signature) => {

        // Flat-format
        console.log(signature);
        // expected result:
        // 0xc49045d2fd3f591c86b1c35ed90315f6b42791401854c5164461946c8f5fea98
        //   0229683de3459716cd7d1e5f9502811766a5eaf9c96c64c1625aaad815cdc3741c

        // Expanded-format
        console.log(mxw.utils.splitSignature(signature));
        // expected result:
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

    wallet.signMessage(binaryData).then((signature) => {

        console.log(signature);
        // expected result:
        // "0xc49045d2fd3f591c86b1c35ed90315f6b42791401854c5164461946c8f5fea98
        //    0229683de3459716cd7d1e5f9502811766a5eaf9c96c64c1625aaad815cdc3741c

        let address = mxw.utils.verifyMessage(binaryData, signature);
        console.log(address);
        // expected result:
        // Should be equal to signer wallet address mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x
    });


:sup:`prototype` . sign ( transaction ) |nbsp| `=> Promise<string>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the signed transaction as a :ref:`hex string <hexstring>`.

    In general, the `sendTransaction`_ method is preferred to ``sign``, as it can automatically
    populate values asynchronously.

    Check on :ref:`Transaction <transaction>` and :ref:`Transaction reciept <transaction-receipt>` for more details.

.. code-block:: javascript
    :caption: *signing transactions*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let provider = mxw.getDefaultProvider("testnet");
    let wallet = new mxw.Wallet(privateKey, provider);

    console.log(wallet.address);
    // expected result:
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
        fee: provider.getTransactionFee("bank", "bank-send")
    };

    wallet.sign(transaction).then((signedTransaction) => {

        console.log(signedTransaction);
        // Should be base64 encoded string

        provider.sendTransaction(signedTransaction).then((tx) => {

            console.log(tx);
            // Should be transaction response with transaction hash value

            // Query transaction receipt by transaction hash
            provider.waitForTransaction(tx.hash).then((receipt) => {

                console.log(receipt.status);
                //expected result:
                //1 (means success)
            });
        });
    });


-----

Cryptographic Functions
#######################

:sup:`prototype` . computeSharedSecret ( otherPublicKey ) |nbsp| `=> string`
    Compute the *shared secret* by using other wallet's public key and returns as a :ref:`hex string <hexstring>`.
    In general, the shared secret should not directly uses as encryption key. Instead of derive it using :ref:`pbkdf2 <pbkdf2>`.

.. code-block:: javascript
    :caption: compute shared secret using own private key and other public key

    let wallet = mxw.Wallet.createRandom();
    let otherWallet = mxw.Wallet.createRandom();
    console.log(wallet.computeSharedSecret(otherWallet.publicKey));
    //expected result:
    //a hexstring, something like this
    //0xcdfa6c550d930fa45b9f938a96a3b76c90e1f90fed7ffd8bbcc6dbd566316e88
-----

Blockchain Operations
#####################

These operations require the wallet have a provider attached to it.

:sup:`prototype` . getBalance ( ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` that resolves to the balance (as a :ref:`BigNumber <bignumber>`,
    in **cin**) of the wallet. Be aware of the number of decimals for *cin* is 18.
    The balance can be convert to a human readable format by :ref:`formatMxw <formatMxw>`, versa :ref:`parseMxw <parseMxw>`.

.. code-block:: javascript
    :caption: check wallet balance

        let privateKey = "0x0000000000000000000000000000000000000000000000000000000000000001";
        let wallet = new mxw.Wallet(privateKey,uatProvider);
        wallet.getBalance().then((balance)=>{
            console.log(mxw.utils.formatMxw("Wallet balance: " + balance));
        });
        // Expected result
        // Wallet balance: 0.0

:sup:`prototype` . getTransactionCount ( ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` that resovles to the number of transactions
    this account has ever sent (as a :ref:`BigNumber <bignumber>`).

.. code-block:: javascript
    :caption: *query the network*

    // We require a provider to query the network
    let provider = mxw.getDefaultProvider("testnet");

    let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let wallet = new mxw.Wallet(privateKey, provider);

    wallet.getBalance().then((balance) => {
        console.log("Balance: " + mxw.utils.formatMxw(balance));
        //expected result:
        //Balance: 0.0
    });

    wallet.getTransactionCount().then((nonce) => {
        console.log("Transaction Count: " + mxw.utils.formatMxw(nonce));
        //expected result:
        //Transaction Count: 0.0
    });

:sup:`prototype` . transfer ( :ref:`AddressOrName <addressOrName>`, value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *transfer transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient alias or wallet address. The ``value`` is the number of *cin*
    (as a :ref:`BigNumber <bignumber>`) that transfers to recipient. Be aware of the number of decimals for *cin*
    is 18.

.. code-block:: javascript
    :caption: *transfer mxw*

    // We require a provider to send transactions
    let provider = mxw.getDefaultProvider("testnet");

    let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let wallet = new mxw.Wallet(privateKey, provider);

    let to = "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae";
    // ... or supports Alias names
    // to: "jeansoon",

    let amount = mxw.utils.parseMxw("1.0");
    // We must pass in the amount as cin (1 mxw = 1e18 cin), so we
    // use this convenience function to convert mxw to cin.

    wallet.transfer(to, amount).then((receipt) => {
         console.log(receipt.status);
        //expected result:
        //1 (means success)
    });

.. _sendTransaction:

:sup:`prototype` . sendTransaction ( transaction ) |nbsp| `=> Promise<TransactionResponse>`
    Sends the *transaction* (see :ref:`Transaction Requests <transaction-request>`) to
    the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Response <transaction-receipt>`. Any properties that are not
    provided will be populated from the network.



-----

Encrypted JSON Wallets
######################

Many systems store private keys as encrypted JSON wallets, in various formats. There are several
formats and algorithms that are used, all of which are supported to be read.
Only the secure scrypt variation can be generated.

See :ref:`Wallet.fromEncryptedJson <fromEncryptedJson>` for creating a
Wallet instance from a JSON wallet.

:sup:`prototype` . encrypt ( password [ , options [ , progressCallback ] ] ) |nbsp| `=> Promise<string>`
    Encrypts the wallet as an encrypted JSON wallet, with the *password*.

    All options are optional. The valid options are:

        - **salt** --- the salt to use for scrypt
        - **iv** --- the initialization vector to use for aes-ctr-128
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
        // expected result:
        // a JSON text contain address, id and various info of the wallet.
    });


-----

.. _signer:

Signer API
##########

The Signer API is an abstract class which makes it easy to extend and add new signers,
that can be used by this library and extension libraries. The :ref:`Wallet <wallet>`
extends the Signer API.

To implement a Signer, inherit the abstract class *mxw.types.Signer* and implement
the following properties:

:sup:`object` . provider
    Returns :ref:`Provider <api-provider>` that is connected to the network. This is optional, however,
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

.. EOFs