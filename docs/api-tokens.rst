.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-tokens:
.. _api-fungible-token:

**************
Fungible Token
**************

Create fungible token required approval from authorities.

-----

Creating Instances
##################

:sup:`FungibleToken` . create ( properties, signerOrProvider ) |nbsp| `=> Promise<FungibleToken>`
    Creates a new instance reference from *signerOrProvider* and send fungible token creation transaction to network
    and returns a :ref:`Promise <promise>` that resolves to a FungibleToken instance.

    The valid fungible token properties are:

        - **name: ** *string* name for the token
        - **symbol: ** *string* symbol for the token
        - **decimals: ** ref:`*BigNumber* <bignumber>` the number of decimals for balance
        - **fixedSupply: ** *bool* the supply mechanisms type (``true``: fixed, ``false``: dynamic)
        - **maxSupply** ref:`*BigNumber* <bignumber>` the maximum supply, set to 0 for unlimited supply (only applied to dynamic supply type)
        - **fee** *int* application fee
        - **owner** the owner of the token (default to wallet creator)
        - **metadata** *string* remarks (optional)

    .. note:: name and symbol should be unique

:sup:`FungibleToken` . fromSymbol ( symbol, signerOrProvider ) |nbsp| `=> Promise<FungibleToken>`
    Query fungible token by symbol from network and returns a :ref:`Promise <promise>` that 
    resolves to a FungibleToken instance.

-----

Prototype
#########

:sup:`prototype` . state |nbsp| `=> TokenState`

    | (Read Only)
    | The valid token state are:

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

:sup:`prototype` . getBalance ( ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` that resolves to the fungible token balance
    (as a :ref:`BigNumber <bignumber>`) of the wallet. Be aware of the number of decimals applied for the token.
    The balance can be convert to a human readable format by :ref:`formatUnits <formatUnits>`,
    versa :ref:`parseUnits <parseUnits>`.

:sup:`prototype` . transfer ( :ref:`AddressOrName <addressOrName>`, value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *transfer fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient alias or wallet address. The ``value`` is the number of *fungible token*
    (as a :ref:`BigNumber <bignumber>`) that transfers to recipient. Be aware of the number of decimals applied for the token.

:sup:`prototype` . mint ( :ref:`AddressOrName <addressOrName>`, value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *mint fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to recipient alias or wallet address. The ``value`` is the number of *fungible token*
    (as a :ref:`BigNumber <bignumber>`) that mint to recipient. Be aware of the number of decimals applied for the token.

.. note:: Only fungible token owner is allowed to sign ``mint`` transaction.

.. code-block:: javascript
    :caption: *mint a fungible token*
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

:sup:`prototype` . burn ( value ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *burn fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The ``value`` is the number of *fungible token* (as a :ref:`BigNumber <bignumber>`) that to be burned.
    Be aware of the number of decimals applied for the token.

:sup:`prototype` . freeze ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *freeze fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to target holder alias or wallet address that to be freeze.

.. note:: Only fungible token middleware is allowed to sign ``freeze`` transaction.

:sup:`prototype` . unfreeze ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *unfreeze fungible token transaction* to the network and returns a :ref:`Promise <promise>` that resolves to a
    :ref:`Transaction Receipt <transaction-receipt>`.

    The :ref:`AddressOrName <addressOrName>` can be set to target holder alias or wallet address that to be unfreeze.

.. note:: Only fungible token middleware is allowed to sign ``unfreeze`` transaction.
