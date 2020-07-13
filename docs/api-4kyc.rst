.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-kyc:

***
KYC
***

Know Your Customer (KYC) is **required** in Maxonrow blockchain. All wallets, tokens, and administrative
operations (e.g., transaction) are required to undergo a KYC process and be verified by three parties (i.e., provider, issuer, and middleware) beforehand.
Only verified wallets, tokens, and administrative operations (e.g, transaction) are allowed to proceed and participate in the blockchain.  

*Administrative operations (e.g., transaction) must first signed by provider, then issuer, and lastly by middleware*

Creating Instances
##################

:sup:`Kyc` . create ( signerOrProvider ) |nbsp| `=> Promise<Kyc>`
    Creates a new instance reference from *signerOrProvider* and connect to a provider (optional).

.. code-block:: javascript
    :caption: *create an instance of KYC with reference from provider*

    let provider = new mxw.Wallet(0x00000000000000000000000000000000000000000000000070726f7669646572);
    let kyc = Kyc.create(provider);

Signing
#######

:sup:`prototype` . getKycAddress ( keyComponent ) |nbsp| `=> string`
    Computes KYC address from key components by SHA2-256 cryptographic hash and
    converts into Bech32 format.

    The valid key components are:

        - **country** --- the country code of issuer
        - **idType** --- the identification document type
        - **id** --- the identification number of the applicant
        - **idExpiry** --- the expire date (YYYYMMDD) of the identification document, in number
        - **dob** --- the applicant's date of birth (YYYMMDD), in number
        - **seed** --- additional value to stir into the hashing

    If the *seed* is not specified, it should be defaulted to 32 bytes of zero.

:sup:`prototype` . sign ( keyComponentOrAddress ) |nbsp| `=> Promise<KycData>`
    Signs *KycAddress* and returns a :ref:`Promise <promise>` that resolves to
    the signed :ref:`KYC Data <kyc-data>`. The JSON object should be **sorted** and
    signed by applicant's wallet.

.. code-block:: javascript
    :caption: *generate KYC address and sign*
        
        //create a new wallet to
        let networkProvider = mxw.getDefaultProvider("localnet");
        var wallet = mxw.Wallet.createRandom().connect(networkProvider);
        Kyc.create(wallet).then((kycR)=>{
            let seed = sha256(toUtf8Bytes(JSON.stringify(sortObject({
                juridical: ["", ""].sort(),
                seed: utils.getHash(utils.randomBytes(32))
            }))));

            let kycAddress = kycR.getKycAddress({
                country: "MY",
                idType: "NIC",
                id: wallet.address,
                idExpiry: 20200101,
                dob: 19800101,
                seed
            });
            
            console.log("KYC Address: " + kycAddress);
            //expected result: 
            //kyc1ekv4s2e75vyzmjjnve3md9ek5zm3pt66949vclrttgkfrrc6squqlxlpsp

            return kycR.sign(kycAddress).then((data) => {
                console.log(JSON.stringify(data));
            });
            //expected result:
            //KYC Data, click on the link above for more information

    });
    
:sup:`prototype` . signTransaction ( transaction ) |nbsp| `=> Promise<KycTransaction>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`signed transaction <kyc-transaction>`. The transaction should be signed by
    KYC provider or KYC issuer.

:sup:`prototype` . approve ( transaction ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *signedTransaction* to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    If an error occurs after the network **may have** received the transaction, the
    promise will reject with the error, with the additional property ``transactionHash``
    so that further processing may be done.

:sup:`prototype` . revoke ( address, signer ) |nbsp| `=> Promise<KycStatusTransaction>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`signed transaction <kyc-status-transaction>`. The transaction should be
    signed by KYC provider.

:sup:`prototype` . signStatusTransaction ( transaction, signer ) |nbsp| `=> Promise<KycStatusTransaction>`
    Signs *transaction* and returns a :ref:`Promise <promise>` that resolves to
    the :ref:`signed transaction <kyc-status-transaction>`. The transaction should be
    signed by KYC provider or KYC issuer.

:sup:`prototype` . sendStatusTransaction ( transaction, signer ) |nbsp| `=> Promise<TransactionReceipt>`
    Sends the *signedTransaction* to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    If an error occurs after the network **may have** received the transaction, the
    promise will reject with the error, with the additional property ``transactionHash``
    so that further processing may be done.

:sup:`prototype` . bind ( :ref:`AddressOrName <addressOrName>`, kycAddress, signer ) |nbsp| `=> Promise<TransactionReceipt>`
    Creates relationship between wallets by sending *kycBind* transaction to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    The :ref:`AddressOrName <addressOrName>` can be set to target alias or wallet address. The ``kycAddress`` is the reference of relationship.

:sup:`prototype` . unbind ( :ref:`AddressOrName <addressOrName>`, kycAddress, signer ) |nbsp| `=> Promise<TransactionReceipt>`
    Removes relationship between wallets by sending *kycUnbind* transaction to the **entire** blockchain network and returns a
    :ref:`Promise <promise>` that resolves to the :ref:`Transaction Receipt <transaction-receipt>`.
    The transaction should be signed by KYC middleware.

    The :ref:`AddressOrName <addressOrName>` can be set to target alias or wallet address. The ``kycAddress`` is the reference of relationship.

Checking Status
###############

:sup:`wallet` . isWhitelisted ( ) |nbsp| `=> Promise<Boolean>`
    Returns a :ref:`Promise <promise>` of the wallet's whitelist status and 
    queries KYC whitelist status by wallet address.

.. code-block:: javascript
    :caption: check if the wallet is whitelisted

    let privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let networkProvider = mxw.getDefaultProvider("localnet");
    let wallet = new mxw.Wallet(privateKey, networkProvider);
    wallet.isWhitelisted().then((result)=>{
        console.log(result);
    }); 
    // expected result:
    // true or false
