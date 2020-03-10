.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-nft:

Non-fungible Token
==================

Create non fungible token required approval from authorities.

-----

Creating Instances
------------------

:sup:`NonFungibleToken` . create ( nonFungibleTokenProperties, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Creates a new instance reference from *signerOrProvider* and send non fungible token creation transaction to network
    and returns a :ref:`Promise <promise>` that resolves to a NonFungibleToken instance.

    The valid non-fungible token properties are:

        - **name :** *string* name of the token
        - **symbol :** *string symbol for the token
        - **fee :** *int* application fee
        - **owner :** the owner of the token (default to wallet creator)
        - **properties :** *string* properties of the token (cannot be overwrite once created)
        - **metadata :** *string* remarks (can be overwrite or update after be created)

    .. note:: name and symbol should be unique

.. code-block:: javascript
    ::caption:: Create NonFungibleToken

    let provider = mxw.getDefaultProvider("testnet");
    let nonFungibleTokenProperties: NonFungibleTokenProperties;
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

    var nonFungibleToken = new NonFungibleToken(symbol, provider);
    nonFungibleToken.create(nonFungibleTokenProperties, provider, defaultOverrides).then((token) => {
        expect(token).to.exist;
    });

:sup:`NonFungibleToken` . fromSymbol ( symbol, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Query non-fungible token by symbol from network and returns a :ref:`Promise <promise>` that 
    resolves to a NonFungibleToken instance.


-----

Prototype
---------

:sup:`prototype` . state |nbsp| `=> NFTokenState`

    | (Read Only)
    | The valid token state are:

        - **flags** -- number (uint)
        - **name** --- the unique token name (string)
        - **symbol** --- the unique token symbol (string)
        - **owner** --- owner of the token (string)
        - **newOwner** --- receiver of token (string)
        - **metadata** --- metadata of token (string)
        - **mintLimit** --- maximum mint limit of token (BigNumber)
        - **transferLimit** --- maximum limit of the token can be transfer (BigNumber)
        - **endorserList** --- list of endorse (string[])
        - **totalSupply** --- total item had been minted by the token (BigNumber)


:sup:`prototype` . transferOwnership ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *transfer non-fungible token* to another person and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

.. code-block:: javascript
    :caption: transfer item ownership

        let provider = mxw.getDefaultProvider("testnet");
        let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let wallet = new mxw.Wallet(privateKey, provider);

        var nonFungibleToken = new NonFungibleToken(symbol, provider);
        nonFungibleToken.transfer(wallet.address).then((receipt) => {
            console.log(receipt.status);
        })


:sup:`prototype` . mint ( :ref:`AddressOrName <addressOrName>`, NonFungibleTokenItem) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *mint non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient alias or wallet address. 

.. code-block:: javascript
    :caption: *mint a non-fungible token item*

        let issuer : mxw.Wallet;
        let item = {
            symbol: symbol,
            itemID: itemId,
            properties: ["prop1"],
            metadata: ["str1", "str2"]
        } ;

        var minterNFT = new NonFungibleToken(symbol, issuer);

        minterNFT.mint(issuer.address, item).then((receipt) => {
            console.log(receipt.status);
        });

:sup:`prototype` . burn () |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *burn non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``value`` is the number of *non-fungible token* (as a :ref:`BigNumber <bignumber>`) that to be burned.
    Be aware of the number of decimals applied for the token.

    let issuer : mxw.Wallet;
        let item = {
            symbol: symbol,
            itemID: itemId,
            properties: ["prop1"],
            metadata: ["str1", "str2"]
        } ;

        var minterNFT = new NonFungibleToken(symbol, issuer);

        minterNFT.burn(issuer.address, item).then((receipt) => {
            console.log(receipt.status);
        });

:sup:`prototype` . freeze ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *freeze non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to target holder alias or wallet address that to be freeze.

.. note:: Only non-fungible token middleware is allowed to sign ``freeze`` transaction.

:sup:`prototype` . unfreeze ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *unfreeze non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to target holder alias or wallet address that to be unfreeze.

.. note:: Only non-fungible token middleware is allowed to sign ``unfreeze`` transaction.

:sup:`prototype` . updateMetadata(metadata) |nbsp| `=> Promise<TransactionReceipt>`
    Update the *metadata of non-fungible token item* to the network and returns a :ref:`Promise <promise>`

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

        token.NonFungibleTokenItem.fromSymbol(symbol, itemId, issuer).then((nftItem) => {
            let nftItemMinted = nftItem;
            console.log(nftItemMinted);
        })

:sup:`prototype` . endorse( ) |nbsp| `=> Promise<TransactionReceipt>`
    Perform endorsement by endorser

:sup:`prototype` . updateItemMetadata(metadata) |nbsp| `=> Promise<TransactionReceipt>`
    Update the *metadata of non-fungible token item* to the network and returns a :ref:`Promise <promise>`

