.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-kyc:

***
KYC
***

Know Your Customer (KYC) is **required** before any operation in Maxonrow blockchain.


Creating Instances
##################

:sup:`Kyc` . create ( signerOrProvider ) |nbsp| `=> Promise<Kyc>`
    Creates a new instance reference from *signerOrProvider* and optionally connect a provider.

.. code-block:: javascript
    :caption: *create a instance of kyc with the reference from provider*

    let provider = mxw.getDefaultProvider("testnet");
    let kyc = kyc.create(provider);

Signing
#######

:sup:`prototype` . getKycAddress ( keyComponent ) |nbsp| `=> string`
    Compute kyc address from key components by SHA2-256 cryptographic hash and
    convert into bech32 format.

    The valid key components are:

        - **country** --- the country code for issuer
        - **idType** --- the identity document type
        - **id** --- the identity number for the applicant
        - **idExpiry** --- the identity document expiry date (YYYMMDD) in number
        - **dob** --- the applicant date of birth (YYYMMDD) in number
        - **seed** --- additional value to stir into the hashing

    If the *seed* is not specified, it should be default to 32 bytes of zero.



:sup:`prototype` . sign ( keyComponentOrAddress ) |nbsp| `=> Promise<KycData>`
    Signs *KycAddress* and returns a :ref:`Promise <promise>` that resolves to
    the signed :ref:`JSON object <kyc-data>`. The JSON object should be **sorted** and
    signed by applicant's wallet.

.. code-block:: javascript
    :caption: *IDK is legal or not*
        
        let kycAddress = {
            country: "MY",
                idType: "NIC",
                id: wallet.address,
                idExpiry: 20200101,
                dob: 19800101,
                seed
        }
            
        kyc.sign(kycAddress);
    

.. _kyc-data:
.. code-block:: javascript
    :caption: *the properties for kyc data*

    {
        kyc: {
            from: string,
            nonce: BigNumberish,
            kycAddress: string
        },
        pub_key: {
            type: string,
            value: string
        },
        signature: string
    }


:sup:`prototype` . signTransaction ( transaction ) |nbsp| `=> Promise<KycTransaction>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`signed transaction <kyc-transaction>`. The transaction should be signed by
    KYC provider or KYC issuer.

.. _kyc-transaction:
.. code-block:: javascript
    :caption: *the properties for kyc transaction*

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


:sup:`prototype` . approve ( transaction ) |nbsp| `=> Promise<TransactionReceipt>`
    Send the *signedTransaction* to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    If an error occurs after the network **may have** received the transaction, the
    promise will reject with the error, with the additional property ``transactionHash``
    so that further processing may be done.

:sup:`prototype` . revoke ( address, signer ) |nbsp| `=> Promise<KycStatusTransaction>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`signed transaction <kyc-status-transaction>`. The transaction should be
    signed by KYC provider.

.. _kyc-status-transaction:
.. code-block:: javascript
    :caption: *the properties for kyc status transaction*

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


:sup:`prototype` . signStatusTransaction ( transaction, signer ) |nbsp| `=> Promise<KycStatusTransaction>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`signed transaction <kyc-status-transaction>`. The transaction should be
    signed by KYC provider or KYC issuer.

:sup:`prototype` . sendStatusTransaction ( transaction, signer ) |nbsp| `=> Promise<TransactionReceipt>`
    Send the *signedTransaction* to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    If an error occurs after the network **may have** received the transaction, the
    promise will reject with the error, with the additional property ``transactionHash``
    so that further processing may be done.

:sup:`prototype` . bind ( :ref:`AddressOrName <addressOrName>`, kycAddress, signer ) |nbsp| `=> Promise<TransactionReceipt>`
    Create relationship between wallets by sending *kycBind* transaction to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    The :ref:`AddressOrName <addressOrName>` can be set to target alias or wallet address. The ``kycAddress`` is the reference of relationship.

:sup:`prototype` . unbind ( :ref:`AddressOrName <addressOrName>`, kycAddress, signer ) |nbsp| `=> Promise<TransactionReceipt>`
    Remove relationship between wallets by sending *kycUnbind* transaction to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    The :ref:`AddressOrName <addressOrName>` can be set to target alias or wallet address. The ``kycAddress`` is the reference of relationship.

Checking status
###############

:sup:`wallet` . isWhitelisted ( ) |nbsp| `=> Promise<Boolean>`
    Return a :ref:`Promise <promise>` of the wallet white list status.
    Query KYC whitelist status by wallet address.
