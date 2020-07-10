.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-provider:

****************
Network Provider
****************

A network provider is an abstracts connection to the blockchain, for issuing queries
and sending signed state-changing transactions.

The *JsonRpcProvider* allows you to connect to blockchain nodes that you
control or have access to, including mainnet, testnets, or localnets.

-----

.. _provider-connect:

Connecting to Blockchain
########################

There are several methods to connect to the blockchain network provider. If you are not
running your own local blockchain node, it is recommended that you use the ``getDefaultProvider()``
method.

:sup:`mxw` . getDefaultProvider( [ network = "localnet" ] ) |nbsp| `=> Provider`
    This creates a FallbackProvider backed by multiple backends.
    
    This is the **recommended** method of connecting to the blockchain network if you are
    not running your own blockchain node.

.. code-block:: javascript
    :caption: *get a standard network provider* 

    let networkProvider = mxw.getDefaultProvider("localnet");


JsonRpcProvider :sup:`( inherits from Provider )`
*************************************************

.. _provider-jsonrpc-properties:

:sup:`prototype` . connection
    An object describing the connection of the JSON-RPC endpoint with the following properties:

    - **url:** *string* url (the JSON-RPC URL)
    - **timeout:** *int* RPC request timeout in milliseconds (default: 120,000 ms)
    - **user:** *string* username (a username to be used for basic authentication, optional)
    - **password:** *string* password ( a password to use for basic authentication, optional)
    - **allowInsecure:** *boolean* allow basic authentication over an insecure HTTP network (default: false)


new :sup:`mxw . providers` . JsonRpcProvider( [ urlOrInfo :sup:`= "http://localhost:26657"` ] [ , network ] )
    Connect to the `JSON-RPC API`_ URL *urlOrInfo* of a blockchain node.

    The *urlOrInfo* may also be specified as an object with the following properties:

    - **url:** *string* url (the JSON-RPC URL, **required**)
    - **timeout:** *int* RPC request timeout in milliseconds (default: 60,000 ms)
    - **user:** *string* username (a username to be used for basic authentication, optional)
    - **password:** *string* password (a password to use for basic authentication, optional)
    - **allowInsecure:** *boolean* allow basic authentication over an insecure HTTP network (default: false)

    **See also:** JSON-RPC provider-specific :ref:`Properties <provider-jsonrpc-properties>` and :ref:`Operations <provider-jsonrpc-extra>`


.. code-block:: javascript
    :caption: *connect to a default provider*

    // You can use any standard network name
    //  - "homestead"
    //  - "testnet"

    let networkProvider = mxw.getDefaultProvider('localnet');


.. code-block:: javascript
    :caption: *connect to private trusted node*

    let provider = new mxw.providers.JsonRpcProvider({
        url: "https://x.x.x.x",
        timeout: 60000
    }, "mxw");


.. code-block:: javascript
    :caption: *connect to private customized node*

    let provider = new mxw.providers.JsonRpcProvider({
        url: "https://x.x.x.x",
        timeout: 60000
    }, {
        chainId: "awesome",
        name: "awesome"
    });

-----

Properties
##########

Not all properties are mutable unless otherwise specified, and will reflect their default values if left unspecified.

.. _provider:

Provider Variables
******************

:sup:`prototype` . blockNumber
    Returns the most recent block number (block height) this provider has seen and has triggered
    events for. If no block has been seen, this is *null*.

    *data type: integer*

:sup:`prototype` . polling
    *mutable*

    If the provider is currently polling because it is actively watching for events. This
    may be set to enable/disable polling temporarily or disabled permanently to allow a
    node process to exit.

    *data type: boolean*

:sup:`prototype` . pollingInterval
    *mutable*

    The frequency (in milliseconds) that the provider is polling. The default interval is 4 seconds.

    This may make sense to lower for polling a local node. When polling external nodes,
    setting this too low may result in the service blocking your IP address or otherwise
    throttling your API calls.

    *data type: integer*

.. _provider-network:

Network
*******

A network represents various properties of a network, such as mainnet,
testnet, or private networks.

:sup:`prototype` . getNetwork ( ) |nbsp| `=> Promise<Network>`
    A :ref:`Promise <promise>` that resolves to a `Network` object describing the
    connected network and chain. A network has the following properties:

    - *chainId* --- the chain ID (network ID) of the connected network
    - *name* --- the name of the network (e.g., "testnet")

.. code-block:: javascript
    :caption: *get a standard network*

    let network = mxw.providers.getNetwork('localnet');
    // {
    //    chainId: "mxw",
    //    name: "localnet"
    // }


.. code-block:: javascript
    :caption: *a custom development network*

    let network = {
        chainId: "localnet",
        name: "local"
    }

-----

.. _provider-account:

Account
*******

*A 'dummy' wallet is used below, there is not real user behind it.*

:sup:`prototype` . getBalance ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` with the balance (as a :ref:`BigNumber <bignumber>`) of
    :ref:`AddressOrName <addressOrName>`.

.. code-block:: javascript
    :caption: *get the balance of an account*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    provider.getBalance(address).then((balance) => {

        // balance is a BigNumber (in cin); format is as a string (in mxw)
        let mxwString = mxw.utils.formatMxw(balance);

        console.log("Balance: " + mxwString);
    });

    //expected result:
    //Balance: 0.0

:sup:`prototype` . getTransactionCount ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` with the number of sent transactions (as a :ref:`BigNumber <bignumber>`)
    from :ref:`AddressOrName <addressOrName>`. This is also the nonce required to send a new transaction.

.. code-block:: javascript
    :caption: *get the transaction count of an account*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    provider.getTransactionCount(address).then((nonce) => {
        console.log("Total Transactions Ever Sent: " + nonce.toString());
    });

    //expected result:
    //Total Transactions Ever Sent: 0

:sup:`prototype` . getAccountNumber ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` with the account number of wallet (as a :ref:`BigNumber <bignumber>`)
    from :ref:`AddressOrName <addressOrName>`.

.. code-block:: javascript
    :caption: *get the account number*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    provider.getAccountNumber(address).then((accountNumber) => {
        console.log("Account number: " + accountNumber.toString());
    });

    //expected result:
    //Account number:0


-----

.. _provider-blockchain:

Blockchain Status
*****************

:sup:`prototype` . getBlockNumber ( ) |nbsp| `=> Promise<number>`
    Returns a :ref:`Promise <promise>` with the latest block number (as a Number).

.. code-block:: javascript
    :caption: *get latest block number*

    provider.getBlockNumber().then((blockNumber) => {
        console.log("Latest block number: " + blockNumber);
    });
    // expected result:
    // Latest block number: "*integer* latest block number" 

:sup:`prototype` . getBlock ( blockHashOrBlockNumber ) |nbsp| `=> Promise<Block>`
    Returns a :ref:`Promise <promise>` with the block at *blockHashOrBlockNumber*. (See: :ref:`Block Responses <blockresponse>`)

.. code-block:: javascript
    :caption: *blocks*

    // Block Number
    provider.getBlock(12345).then((block) => {
        console.log(block);
    });
    //expected result:
    //block response, click on the link above for more information

:sup:`prototype` . getTransactionReceipt ( transactionHash ) |nbsp| `=> Promise<TransactionReceipt>`
    Returns a :ref:`Promise <promise>` with the transaction receipt with *transactionHash*.
    (See: :ref:`Transaction Receipts <transaction-receipt>`)

.. code-block:: javascript
    :caption: *query transaction receipt*

    let transactionHash = "0x434c7fe4c7c7068289f0d369e428b7a3bf3882c3253f2b7f9529c0985a1cb500"

    provider.getTransactionReceipt(transactionHash).then((receipt) => {
        console.log(receipt);
    });
    //expected result:
    //transaction receipt, click on the link above for more information

:sup:`prototype` . getTransactionFee ( route, transactionType, overrides, ... ) |nbsp| `=> Promise<TransactionFee>`
    Returns a :ref:`Promise <promise>` that resolves to the estimated *transaction fee* structure.


    The valid routes and transaction types are:
        - **kyc** --- the route for kyc module
            - **kyc-whitelist** --- the whitelist transaction type
            - **kyc-revokeWhitelist** --- the revoke whitelist transaction type
        - **bank** --- the route for bank module
            - **bank-send** --- the transfer MXW transaction type
        - **token** --- the route for token module
            - **token-mintFungibleToken** --- the mint transaction type
            - **token-burnFungibleToken** --- the burn transaction type
            - **token-freeze** --- the freeze transaction type
            - **token-unfreeze** --- the unfreeze transaction type
            - **token-createFungibleToken** --- the create transaction type
            - **token-setFungibleTokenStatus** --- the set status transaction type
        - **nameservice** --- the route for name service module
            - **nameservice-createAlias** --- the create transaction type
            - **nameservice-setAliasStatus** --- the set status transaction type

.. _transaction-fee:

.. code-block:: javascript
    :caption: *the transaction fee structure*
    
    {
        amount: [
            {
                // The denomination should be in cin
                denom: string,

                // The fee amount in cin
                amount: BigNumberish
            }
        ],
        // Reserved for future
        gas: BigNumberish
    }


.. code-block:: javascript
    :caption: *query the transaction fee*
    
    let value = utils.parseMxw("10").toString();
    provider.getTransactionFee("bank", "bank-send").then((fee) => {
        console.log("Fee:", fee);
    });

-----

.. _waitForTransaction:

Waiting for Transactions
************************

:sup:`prototype` . waitForTransaction ( transactionHash ) |nbsp| `=> Promise<TransactionReceipt>`
    Returns a :ref:`Promise <promise>` which resolves to the
    :ref:`Transaction Receipt <transaction-receipt>` once *transactionHash* is validated.

.. code-block:: javascript
    :caption: *transaction validated*

    provider.waitForTransaction(transactionHash).then((receipt) => {
        console.log('Transaction validated: ' + receipt.hash);
        console.log(receipt);
    });

    //expected result:
    //transaction receipt, click on the link above for more information

-----

Objects and Types
*****************

There are several common objects and types that are commonly used as input parameters or
return types for various provider calls.

-----

.. _blocktag:

Block Tag
=========

A block tag is used to uniquely identify a block's position in the blockchain:

a Number or :ref:`hex string <hexstring>`:
    Each block has a block number (e.g., ``1202`` or ``"0x4b2"``).

"latest":
    The most recently validated block.

"pending":
    The block that is currently being validated.

-----


Provider-Specific Extra API Calls
*********************************

.. _provider-jsonrpc-extra:

**JsonRpcProvider**

:sup:`prototype` . send ( method , params ) |nbsp| `=> Promise<any>`
    Sends the JSON-RPC *method* with *params*. This is useful for calling
    non-standard or less common JSON-RPC methods. A :ref:`Promise <promise>` is
    returned which will resolve to the parsed JSON result.

.. code-block:: javascript
    :caption: *send vendor-specific JSON-RPC API*

    //method parameter is based on vendor RPC API 
    jsonRpcProvider.send('status', [ ]).then((result) => {
        console.log(result);
    });
    // expected result:
    // "status of the provider for this case"

-----

.. _JSON-RPC API: https://github.com/ethereum/wiki/wiki/JSON-RPC

.. EOF