.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-tokens:
.. _api-fungible-token:

**************
Fungible Token
**************


Creating Instances
##################
Creating fungible token requires approval from authorities.

:sup:`FungibleToken` . create ( properties, signerOrProvider ) |nbsp| `=> Promise<FungibleToken>`
    Creates a new instance reference from *signerOrProvider*, then sends fungible token creation transaction to the network
    and returns a :ref:`Promise <promise>` that resolves to a FungibleToken instance.

    The valid fungible token properties are:

        - **name:** *string* name for the token
        - **symbol:** *string* symbol for the token
        - **decimals:** ref:`*BigNumber* <bignumber>` the number of decimals for balance
        - **fixedSupply:** *bool* the supply mechanisms type (``true``: fixed, ``false``: dynamic)
        - **maxSupply:** ref:`*BigNumber* <bignumber>` the maximum supply, set to 0 for unlimited supply (only applicable to dynamic supply type)
        - **fee:** *int* application fee
        - **owner:** the owner of the token (default to wallet creator)
        - **metadata:** *string* remarks (optional)

    .. note:: name and symbol should be unique.

.. code-block:: javascript
    :caption: create fungible token

    let wallet = new mxw.Wallet(0x00000000000000000000000000000000000000000000000070726f7669646572);
    let fungibleTokenProperties = {
        name: "MY " + "symbol",
        symbol: "symbol",
        decimals: 18,
        fixedSupply: true,
        maxSupply: bigNumberify("100000000000000000000000000"),
        fee: {
            to: "address",
            value: bigNumberify("1")
        },
        metadata: ["Fungible Token's metadata is able to modify"]
    };

    token.FungibleToken.create(FungibleTokenProperties, wallet).then((token) => {
        console.log(JSON.stringify(token))
    });


:sup:`FungibleToken` . fromSymbol ( symbol, signerOrProvider ) |nbsp| `=> Promise<FungibleToken>`
    Queries fungible token by symbol from network and returns a :ref:`Promise <promise>` that 
    resolves to a FungibleToken instance.

.. code-block:: javascript
    :caption: check token state

        mxw.token.FungibleToken.fromSymbol("symbol", wallet).then((token)=>{
            console.log(JSON.stringify(token));
        });  

-----

Prototype
#########

:sup:`prototype` . state |nbsp| `=> TokenState`

    | (Read-only)
    | The valid token states are:

        - **type** — token type (fungible or non-fungible)
        - **name** — unique token name
        - **symbol** — unique token symbol
        - **decimals** — number of decimals for balance
        - **fixedSupply** — supply mechanism types (``true``: fixed, ``false``: dynamic)
        - **totalSupply** — total current supply for the token
        - **maxSupply** — maximum supply for the token
        - **approved** — approval status
        - **frozen** — frozen status
        - **owner** — token owner's address
        - **metadata** — optional
        - **burnable** — whether the token balance can be burned, this will be always true for token with dynamic supply

.. code-block:: javascript
    :caption: authorize token action

        let provider = new mxw.Wallet(0x00000000000000000000000000000000000000000000000070726f7669646572);
        let issuer = new mxw.Wallet(0x0000000000000000000000000000000000000000000000000000697373756572);
        let middleware = new mxw.Wallet(0x000000000000000000000000000000000000000000006d6964646c6577617265);

        let tokenState = {
        tokenFees: [
                    { action: FungibleTokenActions.transfer, feeName: "default" },
                    { action: FungibleTokenActions.transferOwnership, feeName: "default" },
                    { action: FungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
        burnable: false,
        };

        token.FungibleToken.approveFungibleToken("symbol",provider, tokenState).then((transaction) => {
            token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
                token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                    console.log("approve"+receipt);
                });
            });
        });

:sup:`prototype` . getBalance ( ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` that resolves to the fungible token balance
    (as a :ref:`BigNumber <bignumber>`) of the wallet. Be aware of the number of decimals applied to the token.
    The balance can be converted to a human-readable format by :ref:`formatUnits <formatUnits>`,
    versa :ref:`parseUnits <parseUnits>`.

:sup:`prototype` . transferOwnership ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Transfer the *fungible token ownership* from token owner's wallet to another wallet and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

:sup:`prototype` . acceptOwnership () |nbsp| `=> Promise<TransactionReceipt>`
    Accept the *fungible token ownership* which transfer from another wallet and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

.. code-block:: javascript
    :caption: transfer and accept token ownership

        let transfereePrivateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let transfereeWallet = new mxw.Wallet(transfereePrivateKey, networkProvider);
        let transferorPrivateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let transferorWallet = new mxw.Wallet(transferorPrivateKey, networkProvider);

        var transferorFungibleToken = token.FungibleToken.create(FungibleTokenProperties, transferorWallet);
        transferorFungibleToken.transferOwnership(transfereeWallet.address).then((receipt) => {
            console.log(JSON.stringify(receipt));
        })

        // authorize the transfer token action 

        //should perform by another party
        var transfereeFungibleToken = token.FungibleToken.create(FungibleTokenProperties, transfereeWallet);
        transfereeFungibleToken.acceptOwnership().then((receipt) => {
            console.log(JSON.stringify(receipt));
        })

        // authorize the accept token action

:sup:`prototype` . transfer ( :ref:`AddressOrName <addressOrName>`, value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *transfer fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient's alias or wallet address. The ``value`` is the number of *fungible token*
    (as a :ref:`BigNumber <bignumber>`) that is being transferred to recipient. Be aware of the number of decimals applied to the token.


:sup:`prototype` . mint ( :ref:`AddressOrName <addressOrName>`, value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *mint fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient's alias or wallet address. The ``value`` is the number of *fungible token*
    (as a :ref:`BigNumber <bignumber>`) that is being minedted to recipient. Be aware of the number of decimals applied to the token.

.. note:: Only fungible token owner is allowed to sign ``mint`` transaction.


:sup:`prototype` . burn ( value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *burn fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``value`` is the number of *fungible token* (as a :ref:`BigNumber <bignumber>`) to be burned.
    Be aware of the number of decimals applied to the token.

.. code-block:: javascript
    :caption: *burn a fungible token*

    let ftInstance = new FungibleTokenItem(symbol, itemID, wallet);
        ftInstance.burn().then((receipt) => {
                console.log(receipt);
        });

:sup:`prototype` . freeze ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *freeze fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to target token holder's alias or wallet address of which is to be frozen.

.. note:: Only fungible token middleware is allowed to sign ``freeze`` transaction.

.. code-block:: javascript
    :caption: freeze token

        let provider = new mxw.Wallet(0x00000000000000000000000000000000000000000000000070726f7669646572);
        let issuer = new mxw.Wallet(0x0000000000000000000000000000000000000000000000000000697373756572);
        let middleware = new mxw.Wallet(0x000000000000000000000000000000000000000000006d6964646c6577617265);

        mxw.token.FungibleToken.freezeFungibleToken("symbol","itemID", provider).then((transaction) => {
            mxw.token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
                mxw.token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                    console.log(JSON.stringify(receipt));
                });
            });
        }); 

:sup:`prototype` . unfreeze ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *unfreeze fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to target token holder's alias or wallet address of which is to be unfrozen.

.. note:: Only fungible token middleware is allowed to sign ``unfreeze`` transaction.

.. code-block:: javascript
    :caption: unfreeze token

        let provider = new mxw.Wallet(0x00000000000000000000000000000000000000000000000070726f7669646572);
        let issuer = new mxw.Wallet(0x0000000000000000000000000000000000000000000000000000697373756572);
        let middleware = new mxw.Wallet(0x000000000000000000000000000000000000000000006d6964646c6577617265);

        mxw.token.FungibleToken.unfreezeFungibleToken("symbol","itemID", provider).then((transaction) => {
            mxw.token.FungibleToken.signFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
                mxw.token.FungibleToken.sendFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                    console.log(JSON.stringify(receipt));
                });
            });
        }); 
