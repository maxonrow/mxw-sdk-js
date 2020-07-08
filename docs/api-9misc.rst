.. |nbsp| unicode:: U+00A0 .. non-breaking space

****
Misc
****

.. _transaction:

Transactions
############

All properties for transaction are optional.

.. code-block:: javascript
    :caption: *a KYC whitelist transaction request*

    {
    "type": "cosmos-sdk/StdTx",
    "value": {
        "msg": [
            {
                "type": "kyc/whitelist",
                "value": {
                    "owner": "mxw1y0j6xqc8dsafx2tfv4m8765mw7wrvlespzfyfq",
                    "kycData": {
                        "payload": {
                            "kyc": {
                                "from": "mxw1nyk9r6347l3a6l2t0yk0mczqgumsnfuqjqwda4",
                                "nonce": "0",
                                "kycAddress": "testKyc1234"
                            },
                            "pub_key": {
                                "type": "tendermint/PubKeySecp256k1",
                                "value": "AhFwNoY/JtmaQnkwPSGGXTqmZnw5izkGEzDBbZ11PCD0"
                            },
                            "signature": "XhyQbVGeS5KmVUIGWuUkA3Mz7nFhpSFeT5nO5XskC15kdRRBDi6Z3pqRm2c9bRCa3j9QWhG+MurOHnI6/QS9GA=="
                        },
                        "signatures": [
                            {
                                "pub_key": {
                                    "type": "tendermint/PubKeySecp256k1",
                                    "value": "Aw96JCN8YXpQqxolKEeMDgpSdYMdgVgOWEdfi96+zo+p"
                                },
                                "signature": "xh4OzyV6B7ES0b3jcuIPqpn3lVw7HD3IUgts6E19wPdr6sdS/sb9wvWp2afN1nXzBHwaRwDmsU1oujhrqRErzg=="
                            },
                            {
                                "pub_key": {
                                    "type": "tendermint/PubKeySecp256k1",
                                    "value": "AxPt3o4lK81VNI5XZZ9ik0HZ0saiEwFXDVbmU/NUhV7V"
                                },
                                "signature": "HPB4aC1XuL/zYsQiPa+Stq5b1FPsXJ9LlBeA8iALl191w/kM5lvFAT5J6UUHmKivpzDknoXuxtyjDkallZYY/w=="
                            }
                        ]
                    }
                }
            }
        ],
        "fee": {
            "amount": [
                {
                    "denom": "cin",
                    "amount": "0"
                }
            ],
            "gas": "0"
        },
        "signatures": [
            {
                "pub_key": {
                    "type": "tendermint/PubKeySecp256k1",
                    "value": "A+J9lnqLz1gvflAaIza0oqrUVP4AhYombtoyn67Fq5/G"
                },
                "signature": "lMCY/8zPuVFKATrjWaCpk2aOeUrg5tNsYx5NKQrKRV1JdHtcK4ZxnfI5B/lHf7MCoxOSYdYCp6GZW7TX7abpWQ=="
            }
        ],
        "memo": ""
    }


------

.. _transaction-request:

Transaction Requests
####################

In order to execute a transaction, a request must be sent. A transaction requests will contain following information:

* Transaction fee

* Transaction memo
    - Transaction type (type of transaction is involved [e.g., transfer MXW, send message, etc.])
    - Transaction data or variables involved

* Transaction signature (done by the requester)

Any property which accepts a number may also be specified as a :ref:`BigNumber <bignumber>`
or :ref:`hex string <hexstring>`. Any property may also be given as a :ref:`Promise <promise>`
which resolves to the expected transaction type.

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
   
------

.. _transaction-receipt:

Transaction Receipts
####################

| After every transaction, a receipt that contains all every information regarding the transaction will be generated.
| Transaction hash and block number are givenn to check the transaction in blockchain.

.. code-block:: javascript

    {
        // Transaction hash (unique identifier)
        hash: "0x30080e4120ee65abdd2f7f9ba3ef2b42c34fb3e03de676d2f116a3a44ce65b74",

        // The block this transaction was validated to
        blockNumber: 350476,    // the block height
        nonce: 265,             // the transaction sequence
        index: 0,               // the transaction index is always set to "0" in receipt
        
        // Transaction status
        status: 1,              // "1" indicates success, "0" indicates failure during execution
        confirmations: 2        // the number of block from the latest block

        result: {
            events: [
                {
                    // The transaction event was emitted to
                    address: "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",  // the event producer
                    event: {
                        // the event hash for the first 20 bytes SHA-256 of event identifier
                        // e.g., SHA-256 of transferred(string, string, bignumber)
                        hash: "0x2cadcfb0c336769d503d557b26fcf1e91819e7e5",
                        // The parameter of this event
                        params: [
                            "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x",
                            "mxw1j4yh2gfumy8d327n0uvztg9075fjzd59vxf9ae",
                            "100000000000000000000000"
                        ],
                        transactionIndex: 0,    // the transaction index is always set to "0" in receipt
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

.. _blockresponse:

Block Responses
###############

.. code-block:: javascript

    {
        // The block height
        blockNumber: 221950,
        // The block timestamp
        blockTime: "2019-08-21T11:11:11.674244178Z",
        // The block proposer's address
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
                                // the event hash for the first 20 bytes SHA-256 of event identifier
                                // e.g., SHA-256 of transferred(string, string, bignumber)
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

.. _kyc-data:
.. code-block:: javascript
    :caption: *the properties of KYC data*

    {
        kyc: {
            from: mxw1v3naycxz0vtkp649va8puctv93hsx4y3z4kjz2,
            kycAddress: kyc1qna9z2vk7464625tzj029f0z3e9e34vsw4ycr6ckctf2lc3dmaaqmxh5ry,
            nonce: 0,
        },
        pub_key: {
            type: tendermint/PubKeySecp256k1,
            value: AzpV86f3fkaeYjSNVhKUoQ9kjsPa81vlo8u7Ap78jWIs
        },
        signature: OM6vDYsJvchZfnL6l+E2l0ot+YKR+Z0HGfjWKWQIYjQTLIVfasFzc7ucYyRtPHsROkicE5XbhArs0MPpmp3gRQ==
    }

------

.. _kyc-transaction:
.. code-block:: javascript
    :caption: *the properties of KYC transaction*

    {
        payload: KycData,
        signatures: [
            { 
                pub_key: {
                    type: string,
                    value: string
                },
                signature: string
            }
        ]
    }


-------

.. _kyc-status-transaction:
.. code-block:: javascript
    :caption: *the properties of KYC transaction status*

    {
        kyc: {
            from: string,
            to: string,
            nonce: BigNumberish,
            status: string
        },
        pub_key: {
            type: string,
            value: string
        },
        signature: string
    }


-------

.. EOF