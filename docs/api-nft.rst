.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-nft:

Non-fungible Token
==================

Create non fungible token required approval from authorities.

-----

Creating Instances
------------------

:sup:`NonFungibleToken` . create ( properties, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Creates a new instance reference from *signerOrProvider* and send non fungible token creation transaction to network
    and returns a :ref:`Promise <promise>` that resolves to a NonFungibleToken instance.

    The valid non-fungible token properties are:

        - **name** --- the unique non-fungible token name
        - **symbol** --- the unique non-fungible token symbol
        - **fee** --- the application fee
        - **owner** --- the owner for the non-fungible token (default to wallet creator)
        - **properties** --- properties of the non-fungible token
        - **metadata** --- optional

:sup:`NonFungibleToken` . fromSymbol ( symbol, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Query non-fungible token by symbol from network and returns a :ref:`Promise <promise>` that 
    resolves to a NonFungibleToken instance.

.. code-block:: javascript
    ::caption:: Create NonFungibleToken

    let nonFungibleTokenProperties: token.NonFungibleTokenProperties;
        nonFungibleTokenProperties = {
            name: "MY " + symbol,
            symbol: symbol,
            fee: {
                to: nodeProvider.nonFungibleToken.feeCollector,
                value: bigNumberify("1")
            },
            metadata: ["Wallet able to manage their own metadata"],
            properties:["Decentralised identifier"]
        };

        return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
            expect(token).to.exist;
        });

-----

Prototype
---------

:sup:`prototype` . state |nbsp| `=> TokenState`
    The valid token state are:

        - **type** --- the token type (fungible, or non-fungible)
        - **name** --- the unique token name
        - **symbol** --- the unique token symbol
        - **decimals** --- the number of decimals for balance
        - **fixedSupply** --- the supply mechanisms type (``true``: fixed, ``false``: dynamic)
        - **totalSupply** --- the total current supply for the token
        - **maxSupply** --- the maximum supply for the token
        - **approved** --- the approval status
        - **frozen** --- the frozen status
        - **owner** --- the token owner address
        - **metadata** --- optional
        - **burnable** --- the token balance allow to be burn or not. This will be always true for dynamic supply token.


:sup:`prototype` . transferOwnership ( addressOrName ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *transfer non-fungible token* to another person and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

.. code-block:: javascript
    :caption: transfer item ownership

        let provider = mxw.getDefaultProvider("testnet");
        let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let wallet = new mxw.Wallet(privateKey, provider);

        return nftItemMinted.transfer(wallet.address).then((receipt) => {
            console.log(receipt.status);
        })


:sup:`prototype` . mint ( addressOrName, NonFungibleTokenItem) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *mint non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``addressOrName`` can be set to recipient alias or wallet address. 

.. code-block:: javascript
    :caption: *mint a non-fungible token item*

        let issuer : mxw.Wallet;
        let item = {
            symbol: symbol,
            itemID: itemId,
            properties: ["prop1"],
            metadata: ["str1", "str2"]
        } as token.NonFungibleTokenItem;

        let minterNFT = new NonFungibleToken(symbol, issuer);

        return minterNFT.mint(issuer.address, item).then((receipt) => {
            console.log(receipt.status).to.equal(1);
        });

:sup:`prototype` . burn ( value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *burn non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``value`` is the number of *non-fungible token* (as a :ref:`BigNumber <bignumber>`) that to be burned.
    Be aware of the number of decimals applied for the token.

:sup:`prototype` . freeze ( addressOrName ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *freeze non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``addressOrName`` can be set to target holder alias or wallet address that to be freeze.

.. note:: Only non-fungible token middleware is allowed to sign ``freeze`` transaction.

:sup:`prototype` . unfreeze ( addressOrName ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *unfreeze non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``addressOrName`` can be set to target holder alias or wallet address that to be unfreeze.

.. note:: Only non-fungible token middleware is allowed to sign ``unfreeze`` transaction.


-----

Item
----
:sup:`prototype` . getParent() |nbsp| `=> Non-fungible Token<NonFungibleToken>`
    *Get parent* of the item. 

.. code-block:: javascript
    :caption: Get item parents
    
        let issuer : mxw.Wallet;
        let item = {
            symbol: symbol,
            itemID: itemId,
            properties: ["prop1"],
            metadata: ["str1", "str2"]
        } as token.NonFungibleTokenItem;

        return NonFungibleTokenItem.fromSymbol(symbol, itemId, issuer).then((nftItem) => {
            let nftItemMinted = nftItem;
            console.log(nftItemMinted);
        })

:sup:`prototype` . endorse( ) |nbsp| `=> Promise<TransactionReceipt>`
    Perform endorsement by endorser

:sup:`prototype` . updateMetadata(metadata) |nbsp| `=> Promise<TransactionReceipt>`
    Update the *metadata of non-fungible token item* to the network and returns a :ref:`Promise <promise>`