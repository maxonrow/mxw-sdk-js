.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-nft:

******************
Non-fungible Token
******************

.. container:: text section

(Issuer, provider, middleware story)
A non-fungible token(NFT) is a special type of cryptographic token which represents something unique; non-fungible 
token are thus not mutually interchangeable by their individual specification. This is in contrast to 
cryptocurrencies like Zcash, and many network or utility tokens that are fungible in nature.

-----

Creating Instances
##################
Create non fungible token required approval from authorities

:sup:`NonFungibleToken` . create ( nonFungibleTokenProperties, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Creates a new instance reference from *signerOrProvider* and send non fungible token creation transaction to network
    and returns a :ref:`Promise <promise>` that resolves to a NonFungibleToken instance.

    The valid non-fungible token properties are:

        - **name :** *string* (name of the token)
        - **symbol :** *string* (symbol for the token)
        - **fee :** *int* (application fee)
        - **properties :** *string* (properties of the token)
        - **metadata :** *string* (remarks) 

    .. note:: 
        | name and symbol must be unique, 
        | metadata can be change after the token is created, but properties can't

.. code-block:: javascript
    :caption: Create NonFungibleToken

    let provider = mxw.getDefaultProvider("testnet");
    let nonFungibleTokenProperties: NonFungibleTokenProperties;
    nonFungibleTokenProperties = {
        name: "MY " + "symbol",
        symbol: "symbol",
        fee: {
            to: "address",
            value: bigNumberify("1")
        },
        metadata: ["Wallet able to manage their own metadata"],
        properties:["Decentralised identifier"]
    };

    var nonFungibleToken = new NonFungibleToken("symbol", provider);
    nonFungibleToken.create(nonFungibleTokenProperties, provider).then((token) => {
        console.log(JSON.stringify(token))
    });

:sup:`NonFungibleToken` . fromSymbol ( symbol, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Query non-fungible token by symbol from network and returns a :ref:`Promise <promise>` that 
    resolves to a NonFungibleToken instance.

.. code-block:: javascript
    :caption: Check on token state

        mxw.nonFungibleToken.NonFungibleToken.fromSymbol("symbol","issuer address").then((token)=>{
            console.log(JSON.stringify(token))
 });  

-----

Prototype
*********

:sup:`prototype` . state |nbsp| `=> NFTokenState`

    | (Read Only)
    | The valid token state are:

        - **flags** -- *uint* (number)
        - **name** --- *string* (the unique token name)
        - **symbol** ---*string* (the unique token symbol)
        - **owner** --- *sting* (address of owner of the token)
        - **newOwner** --- *string* (address of receiver of token)
        - **metadata** --- *string* (metadata / remarks of token) 
        - **mintLimit** --- *BigNumber* (maximum mint limit of token)
        - **transferLimit** --- *BigNumber* (maximum limit of the token can be transfer)
        - **endorserList** --- *string[]* list of endorser 
        - **totalSupply** --- *BigNumber* (total item had been minted by the token)

.. note:: All token must be authorities, before it can use to mint item or transfer ownership. All token state must be assigned.

.. code-block:: javascript
    :caption: authorities token

        let provider = mxw.getDefaultProvider("testnet");
        let issuer = new mxw.Wallet(0x0000000000000000000000000000000000000000000000000000697373756572);
        let middleware = new mxw.Wallet(0x000000000000000000000000000000000000000000006d6964646c6577617265);

        let tokenState = {
        tokenFees: [
                    { action: NonFungibleTokenActions.transfer, feeName: "default" },
                    { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
                    { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" }
                    ],
        endorserList: [],
        mintLimit: 1,
        transferLimit: 1,
        burnable: false,
        pub: false
        };

        token.NonFungibleToken.approveNonFungibleToken("symbol",provider, tokenState).then((transaction) => {
            token.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
                token.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                    console.log("approve"+receipt);
                });
            });
        });

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
            console.log(JSON.stringify(receipt));
        })


:sup:`prototype` . mint ( :ref:`AddressOrName <addressOrName>`, NonFungibleTokenItem) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *mint non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient alias or wallet address. 

.. code-block:: javascript
    :caption: *mint a non-fungible token item*

        let issuer : mxw.Wallet;
        let item = {
            symbol: "symbol",
            itemID: "itemId",
            properties: "prop1",
            metadata: "str1"
        } ;

        var minterNFT = new NonFungibleToken(symbol, issuer);

        minterNFT.mint(issuer.address, item).then((receipt) => {
            console.log(JSON.stringify(receipt));
        });

.. note:: symbol of the minted item must be the same as the token symbol

:sup:`prototype` . updateMetadata(*string* metadata) |nbsp| `=> Promise<TransactionReceipt>`
    Update the *metadata of non-fungible token item* to the network and returns a :ref:`Promise <promise>`

.. code-block:: javascript
    :caption: *update metadata of a non-fungible token*

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

    let ntfInstance = new NonFungibleTokenItem(nonFungibleTokenProperties,provider);

    //overwrite the token metadata with string "overwrite"
    ntfInstance.updateMetadata("overwite").then((receipt) => {
            console.log(JSON.stringify(receipt));
    });

    //adding new info into the token metadata
    let nftItemStatus = ntfInstance.getState();
    ntfInstance.updateMetadata(nftItemStatus.metadata + "overwite").then((receipt) => {
            console.log(JSON.stringify(receipt));
    });

-----

Item
####
Creating an item instance, three components must be included(symbol, itemId and address of).

:sup:`prototype`. getState() |nbsp| `=> NFTokenState`
    Returns to the state of Non-fungible Token Item status

    | (Read Only)
    | The valid token state are:

        - **symbol** -- symbol of the non-fungible token item
        - **itemID** -- ID of the non-fungible token item
        - **properties** -- properties of the non- fungible token item
        - **metadata** -- metadata of the non-fungible token item

.. code-block:: javascript
    :caption: Get item status

        ntfInstance.getState().then((result)=>{
            console.log(JSON.stringify(result));
        });

:sup:`NonFungibleTokenItem` . fromSymbol ( symbol,itemID, signerOrProvider ) |nbsp| `=> Promise<NonFungibleToken>`
    Query non-fungible token by symbol from network and returns a :ref:`Promise <promise>` that 
    resolves to a NonFungibleToken instance.

.. code-block:: javascript
    :caption: Check on item state

        mxw.nonFungibleToken.NonFungibleToken.fromSymbol("symbol","itemID","issuer address").then((token)=>{
            console.log(JSON.stringify(token))
        });  

.. code-block:: javascript
    :caption: Get the state of token that minted this item

        mxw.nonFungibleToken.NonFungibleToken.fromSymbol("symbol","itemID","issuer address").then((token)=>{
            console.log(JSON.stringify(token))
            var mintedNFTItem = nftItem;
            console.log(mintedNFTItem.parent.state);
        });


:sup:`prototype` . burn () |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *burn non-fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`. To burn item, the token burn flag must be true.

    The ``value`` is the number of *non-fungible token* (as a :ref:`BigNumber <bignumber>`) that to be burned.
    Be aware of the number of decimals applied for the token.

.. code-block:: javascript
    :caption: *burn a non-fungible token item*

        let ntfInstance = new NonFungibleTokenItem(symbol, itemID, address);
        ntfInstance.burn().then((receipt) => {
                console.log(receipt);
        });

:sup:`prototype` . endorse( ) |nbsp| `=> Promise<TransactionReceipt>`
    Perform endorsement by endorser

.. code-block:: javascript
    :caption: *endorse a non-fungible token item*

    let ntfInstance = new NonFungibleTokenItem("symbol", "itemID", "address");
    ntfInstance.endorse().then((receipt) => {
            console.log(receipt);
    });

:sup:`prototype` . updateItemMetadata(metadata) |nbsp| `=> Promise<TransactionReceipt>`
    Update the *metadata of non-fungible token item* to the network and returns a :ref:`Promise <promise>`

.. code-block:: javascript
    :caption: *update metadata of a non-fungible token item*

    let ntfInstance = new NonFungibleTokenItem("symbol", "itemID", "address");

    //overwrite the item metadata with string "overwrite"
    ntfInstance.updateItemMetadata("overwite").then((receipt) => {
            console.log(receipt);
    });

    //adding new info into the item metadata
    let nftItemStatus = ntfInstance.getState(0);
    ntfInstance.updateItemMetadata(nftItemStatus.metadata + "overwite").then((receipt) => {
            console.log(receipt);
    });

Additional Action
*****************
Freeze and unfreeze item

.. code-block:: javascript
    :caption: freeze item

        let provider = mxw.getDefaultProvider("testnet");
        let issuer = new mxw.Wallet(0x0000000000000000000000000000000000000000000000000000697373756572);
        let middleware = new mxw.Wallet(0x000000000000000000000000000000000000000000006d6964646c6577617265);

        token.NonFungibleToken.freezeNonFungibleTokenItem("symbol","itemID",provider).then((transaction) => {
            token.NonFungibleToken.signNonFungibleTokenItemStatusTransaction(transaction, issuer).then((transaction) => {
                token.NonFungibleToken.sendNonFungibleTokenItemStatusTransaction(transaction, middleware).then((receipt) => {
                    console.log(JSON.stringify(receipt));
                });
            });
        }); 

.. code-block:: javascript
    :caption: unfreeze item

        let provider = mxw.getDefaultProvider("testnet");
        let issuer = new mxw.Wallet(0x0000000000000000000000000000000000000000000000000000697373756572);
        let middleware = new mxw.Wallet(0x000000000000000000000000000000000000000000006d6964646c6577617265);

        token.NonFungibleToken.unfreezeNonFungibleTokenItem("symbol","itemID",provider).then((transaction) => {
            token.NonFungibleToken.signNonFungibleTokenItemStatusTransaction(transaction, issuer).then((transaction) => {
                token.NonFungibleToken.sendNonFungibleTokenItemStatusTransaction(transaction, middleware).then((receipt) => {
                    console.log(JSON.stringify(receipt));
                });
            });
        }); 

