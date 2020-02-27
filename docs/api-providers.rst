.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-provider:

********
Provider
********

A Provider abstracts a connection to the blockchain, for issuing queries
and sending signed state changing transactions.

The *JsonRpcProvider* allow you to connect to blockchain nodes that you
control or have access to, including mainnet, testnets, or localnets.

-----

.. _provider-connect:

Connecting to Blockchain
########################

There are several methods to connect to the blockchain network provided. If you are not
running your own local blockchain node, it is recommended that you use the ``getDefaultProvider()``
method.

:sup:`mxw` . getDefaultProvider( [ network = "testnet" ] ) |nbsp| `=> Provider`
    This creates a FallbackProvider backed by multiple backends.
    
    This is the **recommended** method of connecting to the blockchain network if you are
    not running your own blockchain node.

.. code-block:: javascript
    :caption: *get a standard network provider* 

    let provider = mxw.getDefaultProvider("testnet");


JsonRpcProvider :sup:`( inherits from Provider )`
*************************************************

.. _provider-jsonrpc-properties:

:sup:`prototype` . connection
    An object describing the connection of the JSON-RPC endpoint with the properties:

    - **url :** *string* url (the JSON-RPC URL)
    - **timeout :** *int* RPC request timeout in milliseconds (default: 120,000 ms)
    - **user :** *string* username (a username to use for Basic Authentication) *optional*
    - **password :** *string* password ( a password to use for Basic Authentication) *optional*
    - **allowInsecure :** *boolean* allowable of Basic Authentication over an insecure HTTP network (default: false)


new :sup:`mxw . providers` . JsonRpcProvider( [ urlOrInfo :sup:`= "http://localhost:26657"` ] [ , network ] )
    Connect to the `JSON-RPC API`_ URL *urlorInfo* of an blockchain node.

    The *urlOrInfo* may also be specified as an object with the properties:

    - **url :** *string* url (the JSON-RPC URL) ***required**
    - **timeout :** *int* RPC request timeout in milliseconds (default: 60,000 ms)
    - **user :** *string* username (a username to use for Basic Authentication) *optional*
    - **password :** *string* password ( a password to use for Basic Authentication) *optional*
    - **allowInsecure :** *boolean* allowable of Basic Authentication over an insecure HTTP network (default: false)

    **Also See:** JSON-RPC provider-specific :ref:`Properties <provider-jsonrpc-properties>` and :ref:`Operations <provider-jsonrpc-extra>`

   

.. code-block:: javascript
    :caption: *connect to a default provider*

    // You can use any standard network name
    //  - "homestead"
    //  - "testnet"

    let provider = mxw.getDefaultProvider('testnet');


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
**********

Not all properties are mutable unless otherwise specified, and will reflect thier default values if left unspecified.

.. _provider:

Provider Variables
==================

:sup:`prototype` . blockNumber
    return the most recent block number (block height) this provider has seen and has triggered
    events for. If no block has been seen, this is *null*.

:sup:`prototype` . polling
    *mutable*

    If the provider is currently polling because it is actively watching for events. This
    may be set to enable/disable polling temporarily or disabled permanently to allow a
    node process to exit.

:sup:`prototype` . pollingInterval
    *mutable*

    The frequency (in milliseconds) that the provider is polling. The default interval is 4 seconds.

    This may make sense to lower for polling a local node. When polling external nodes,
    setting this too low may result in the service blocking your IP address or otherwise
    throttling your API calls.

.. _provider-network:

Network
=======

A network represents various properties of a network, such as mainnet (i.e. "testnet"),
testnet or private networks.

:sup:`prototype` . getNetwork ( ) |nbsp| `=> Promise<Network>`
    A :ref:`Promise <promise>` that resolves to a `Network` object describing the
    connected network and chain. A network has the following properties:

    - *chainId* --- the chain ID (network ID) of the connected network
    - *name* --- the name of the network (e.g. "testnet")

.. code-block:: javascript
    :caption: *get a standard network*

    let network = mxw.providers.getNetwork('testnet');
    // {
    //    chainId: "mxw",
    //    name: "testnet"
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
=======

:sup:`prototype` . getBalance ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` with the balance (as a :ref:`BigNumber <bignumber>`) of
    the :ref:`AddressOrName <addressOrName>`.

.. code-block:: javascript
    :caption: *get the balance of an account*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    provider.getBalance(address).then((balance) => {

        // balance is a BigNumber (in cin); format is as a string (in mxw)
        let mxwString = mxw.utils.formatMxw(balance);

        console.log("Balance: " + mxwString);
    });

:sup:`prototype` . getTransactionCount ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` with the number of sent transactions (as a :ref:`BigNumber <bignumber>`)
    from the :ref:`AddressOrName <addressOrName>`. This is also the nonce required to send a new transaction.

.. code-block:: javascript
    :caption: *get the transaction count of an account*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    provider.getTransactionCount(address).then((nonce) => {
        console.log("Total Transactions Ever Sent: " + nonce.toString());
    });

:sup:`prototype` . getAccountNumber ( :ref:`AddressOrName <addressOrName>` ) |nbsp| `=> Promise<BigNumber>`
    Returns a :ref:`Promise <promise>` with the account number of wallet (as a :ref:`BigNumber <bignumber>`)
    from the :ref:`AddressOrName <addressOrName>`.

.. code-block:: javascript
    :caption: *get the account number*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    provider.getAccountNumber(address).then((accountNumber) => {
        console.log("Account number: " + accountNumber.toString());
    });


-----

.. _provider-blockchain:

Blockchain Status
================

:sup:`prototype` . getBlockNumber ( ) |nbsp| `=> Promise<number>`
    Returns a :ref:`Promise <promise>` with the latest block number (as a Number).

.. code-block:: javascript
    :caption: *get latest block number*

    provider.getBlockNumber().then((blockNumber) => {
        console.log("Latest block number: " + blockNumber);
    });

:sup:`prototype` . getBlock ( blockHashOrBlockNumber ) |nbsp| `=> Promise<Block>`
    Returns a :ref:`Promise <promise>` with the block at *blockHashOrBlockNumber*. (See: :ref:`Block Responses <blockresponse>`)

.. code-block:: javascript
    :caption: *blocks*

    // Block Number
    provider.getBlock(12345).then((block) => {
        console.log(block);
    });

:sup:`prototype` . getTransactionReceipt ( transactionHash ) |nbsp| `=> Promise<TransactionReceipt>`
    Returns a :ref:`Promise <promise>` with the transaction receipt with *transactionHash*.
    (See: :ref:`Transaction Receipts <transaction-receipt>`)

.. code-block:: javascript
    :caption: *query transaction receipt*

    let transactionHash = "0x434c7fe4c7c7068289f0d369e428b7a3bf3882c3253f2b7f9529c0985a1cb500"

    provider.getTransactionReceipt(transactionHash).then((receipt) => {
        console.log(receipt);
    });

:sup:`prototype` . getTransactionFee ( route, transactionType, overrides, ... ) |nbsp| `=> Promise<TransactionFee>`
    Returns a :ref:`Promise <promise>` that resolves to the estimated *transaction fee* structure.


    The valid routes and transaction types are:
        - **kyc** --- the route for kyc module
            - **kyc-whitelist** --- the whitelist transaction type
            - **kyc-revokeWhitelist** --- the revoke whitelist transaction type
        - **bank** --- the route for bank module
            - **bank-send** --- the MXW transfer transaction type
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
    provider.getTransactionFee("bank", "bank-send", null, value).then((fee) => {
        console.log("Fee:", fee);
    });

-----

.. _waitForTransaction:

Waiting for Transactions
========================

:sup:`prototype` . waitForTransaction ( transactionHash ) |nbsp| `=> Promise<TransactionReceipt>`
    Return a :ref:`Promise <promise>` which resolves to the
    :ref:`Transaction Receipt <transaction-receipt>` once *transactionHash* is validated.

.. code-block:: javascript
    :caption: *transaction validated*

    provider.waitForTransaction(transactionHash).then((receipt) => {
        console.log('Transaction validated: ' + receipt.hash);
        console.log(receipt);
    });

-----

Objects and Types
=================

There are several common objects and types that are commonly used as input parameters or
return types for various provider calls.

-----

.. _blocktag:

Block Tag
---------

A block tag is used to uniquely identify a block's position in the blockchain:

a Number or :ref:`hex string <hexstring>`:
    Each block has a block number (eg. ``1202`` or ``"0x4b2"``).

"latest":
    The most recently validated block.

"pending":
    The block that is currently being validated.

-----

.. _blockresponse:

Block Responses
---------------

.. code-block:: javascript

    {
        // The block height
        blockNumber: 221950,
        // The block timestamp
        blockTime: "2019-08-21T11:11:11.674244178Z",
        // The block proposer address
        proposerAddress: "mxwvaloper1kzzum9s468h2xe9sgasvyqheth4qk3sjh8l8a3",
        // The total committed transactions
        totalTransactions: 1234,

        results: {
            // The transaction was validated in the block
            transactions: [
                {
                    // Transaction hash (unique identifier)
                    hash: "0x47bef4762a8b5646f03b346e64cebde005370a2d4c0610c833fa17828ad1878e",
                    nonce: 77,
                    transactionIndex: 0

                    events: [
                        {
                            // The event owner
                            address: "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",

                            // The transaction event was emitted to
                            event: {
                                // the event hash for first 20 bytes SHA256 of event identifier
                                // e.g: SHA256 of Transferred(string,string,bignumber)
                                hash: "0x2cadcfb0c336769d503d557b26fcf1e91819e7e5",

                                // The parameter of this event
                                params: [
                                    "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
                                    "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae",
                                    "100000000000000000000000"
                                ],
                                transactionIndex: 0,    // the transaction index in the block
                                eventIndex: 0           // the event index of this transaction
                            }
                        }
                    ],

                    // The transaction log messages
                    logs: [
                        {
                            success: true,
                            info: {
                            }
                        }
                    ]
                }
            ]
        }
    }

-----

.. _transaction-request:

Transaction Requests
====================

In order to excecute a transaction, a requests must be send. A Transaction Requests will contain following infomation:-

*Transaction fee
*Transaction memo
    -Transaction Type(what kind of transaction is involve ex.transfer mxw, send message etc.)
    -Transaction data or variables involve
*Transaction signature (done by the requester)

Any property which accepts a number may also be specified as a :ref:`BigNumber <bignumber>`
or :ref:`hex string <hexstring>`. Any property may also be given as a :ref:`Promise <promise>`
which resolves to the expected type.

.. code-block:: javascript

    {
        type: "cosmos-sdk/StdTx",
        value: {
            // Transaction system fee in 18 decimals (cin)
            fee: {
                amount: [
                    {
                        amount: "10000000000000000000",
                        denom: "cin"
                    }
                ],
                gas: "200000"
            },

            // Transaction memo that can fits in 256 UTF8 characters
            memo: "",

            msg: [
                {
                    // Transaction type
                    type: "mxw/MsgSend",

                    // Transaction message payload
                    value: {
                        amount: [
                            {
                                amount: "100000000000000000000000",
                                denom: "cin"
                            }
                        ],
                        fromAddress: "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
                        toAddress: "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae"
                    }
                }
            ],

            // Transaction signatures
            signatures: [
                {
                    signature: "8F0GZv1QsMihuCrOS92x1TbpN0qhUNzhr+JuuHMD4x5O4jFuZPI8PIMAt0EqyCK2teF2SEiRYRm4RntXJulkWA==",
                    pubKey: {
                        type: "tendermint/PubKeySecp256k1",
                        valu: "AvUZonVWLNSnH6s7WCdVgJEtQx1lLgtwsqjtFk4Yqabt"
                    }
                }
            ]
        }
    }

-----

.. _transaction-receipt:

Transaction Receipts
====================

| After every transaction, a receipt will be generated it contains every infomation regarding the transaction.
| Transaction hash and block number is given, to check the transaction on blockchain.

.. code-block:: javascript

    {
        // Transaction hash (unique identifier)
        hash: "0x30080e4120ee65abdd2f7f9ba3ef2b42c34fb3e03de676d2f116a3a44ce65b74",

        // The block this transaction was validated to
        blockNumber: 350476,    // the block height
        nonce: 265,             // the transaction sequence
        index: 0,               // the transaction index always set 0 in receipt
        
        // Transaction status
        status: 1,              // 1 indicated successful, 0 indicated failure during execution
        confirmations: 2        // the number of block from latest block

        result: {
            events: [
                {
                    // The transaction event was emitted to
                    address: "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",  // the event producer
                    event: {
                        // the event hash for first 20 bytes SHA256 of event identifier
                        // e.g: SHA256 of Transferred(string,string,bignumber)
                        hash: "0x2cadcfb0c336769d503d557b26fcf1e91819e7e5",
                        // The parameter of this event
                        params: [
                            "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
                            "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae",
                            "100000000000000000000000"
                        ],
                        transactionIndex: 0,    // the transaction index always set 0 in receipt
                        eventIndex: 0           // the event index of this transaction
                    }
                }
            ],

            // Transaction logs
            logs: [
                {
                    success: true,
                    info: {
                    }
                }
            ]
        },

        // Transaction payload
        data: {
            type: "cosmos-sdk/StdTx",
            value: {
                fee: {
                    amount: [
                        {
                            amount: "10000000000000000000",
                            denom: "cin"
                        }
                    ],
                    gas: "200000"
                },
                memo: "",
                msg: [
                    {
                        type: "mxw/MsgSend",
                        value: {
                            amount: [
                                {
                                    amount: "100000000000000000000000",
                                    denom: "cin"
                                }
                            ],
                            fromAddress: "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
                            toAddress: "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae"
                        }
                    }
                ],
                signatures: [
                    {
                        signature: "8F0GZv1QsMihuCrOS92x1TbpN0qhUNzhr+JuuHMD4x5O4jFuZPI8PIMAt0EqyCK2teF2SEiRYRm4RntXJulkWA==",
                        pubKey: {
                            type: "tendermint/PubKeySecp256k1",
                            valu: "AvUZonVWLNSnH6s7WCdVgJEtQx1lLgtwsqjtFk4Yqabt"
                        }
                    }
                ]
            }
        }
    }

-----

Provider Specific Extra API Calls
*********************************

.. _provider-jsonrpc-extra:

**JsonRpcProvider**

:sup:`prototype` . send ( method , params ) |nbsp| `=> Promise<any>`
    Send the JSON-RPC *method* with *params*. This is useful for calling
    non-standard or less common JSON-RPC methods. A :ref:`Promise <promise>` is
    returned which will resolve to the parsed JSON result.

.. code-block:: javascript
    :caption: *send vendor specific JSON-RPC API*

    jsonRpcProvider.send('status', [ ]).then((result) => {
        console.log(result);
    });

-----

.. _JSON-RPC API: https://github.com/ethereum/wiki/wiki/JSON-RPC

.. EOF