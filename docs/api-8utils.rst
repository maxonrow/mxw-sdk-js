.. |nbsp| unicode:: U+00A0 .. non-breaking space

*********
Utilities
*********

The utility functions provide a large assortment of common utility functions
required to write dapps, process user input and format data.

-----

Addresses
#########

Wallet address is using the bech32 format (`BIP-173`_). There are several formats
available to represent wallet addresses and various ways they are determined.

.. _utils-get-address:

:sup:`utils` . getAddress ( address ) |nbsp| `=> Address`
    Normalize any supported address-format to include checksum.

.. _utils-compute-hex-address:

:sup:`utils` . computeHexAddress ( address ) |nbsp| `=> Address`
    Convert the supported address-format to checksum hex-format.

.. _utils-get-hash:

:sup:`utils` . getHash ( hash ) |nbsp| `=> string`
    Convert the hash to checksum hex-format.

.. code-block:: javascript
    :caption: *convert between address formats*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";

    console.log(mxw.utils.getAddress(address));
    // mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x
    console.log(mxw.utils.computeHexAddress(address));
    // 0x379612aD7EDf1f2de80DDFE489Ad8210691F8d73


.. code-block:: javascript
    :caption: *convert to hash checksum hex-format*

    let hash = "0x47bef4762a8b5646f03b346e64cebde005370a2d4c0610c833fa17828ad1878e";
    console.log(mxw.utils.getHash(hash));
    // 0x47bef4762a8B5646F03B346E64cEBdE005370a2D4C0610C833Fa17828Ad1878e


-----

.. _arrayish:

Arrayish
########

An arrayish object is used to describe binary data and has the following conditions met:

    - has a *length* property
    - has a value for each index from 0 up to (but excluding) *length*
    - has a valid byte for each value; a byte is an integer in the range [0, 255]
    - is **not** a string

**Examples:** ``Buffer``, ``[ 1, 2, 3 ]``, ``Uint8Array``

:sup:`utils` . isArrayish ( object ) |nbsp| `=> boolean`
    Returns true if *object* can be treated as an arrayish object.

:sup:`utils` . arrayify ( hexStringOrBigNumberOrArrayish ) |nbsp| `=> Uint8Array`
    Returns a Uint8Array of a hex string, BigNumber or of an `Arrayish`_ object.

:sup:`utils` . concat ( arrayOfHexStringsAndArrayish ) |nbsp| `=> Uint8Array`
    Return a Uint8Array of all *arrayOfHexStringsAndArrayish* concatenated.

:sup:`utils` . padZeros ( typedUint8Array, length ) |nbsp| `=> Uint8Array`
    Return a Uint8Array of *typedUint8Array* with zeros prepended to *length* bytes.

:sup:`utils` . stripZeros ( hexStringOrArrayish ) |nbsp| `=> Uint8Array`
    Returns a Uint8Array with all leading zero **bytes** striped.

-----

.. _bignumber:

Big Numbers
###########

A BigNumber is an immutable object which allow accurate math operations
on values larger than :ref:`JavaScript can accurately handle <ieee754>`
can safely handle. Also see: :ref:`Constants <constants>`

:sup:`prototype` . add ( otherValue ) |nbsp| `=> BigNumber`
    Return a new BigNumber of this plus *otherValue*.

:sup:`prototype` . sub ( otherValue ) |nbsp| `=> BigNumber`
    Return a new BigNumber of this minus *otherValue*.

:sup:`prototype` . mul ( otherValue ) |nbsp| `=> BigNumber`
    Return a new BigNumber of this times *otherValue*.

:sup:`prototype` . div ( otherValue ) |nbsp| `=> BigNumber`
    Return a new BigNumber of this divided by *otherValue*.

:sup:`prototype` . mod ( otherValue ) |nbsp| `=> BigNumber`
    Return a new BigNumber of this modulo *otherValue*.

:sup:`prototype` . maskn ( bits ) |nbsp| `=> BigNumber`
    Return a new BigNumber with the number of *bits* masked.

:sup:`prototype` . eq ( otherValue ) |nbsp| `=> boolean`
    Return true if this is equal to *otherValue*.

:sup:`prototype` . lt ( otherValue ) |nbsp| `=> boolean`
    Return true if this is less than *otherValue*.

:sup:`prototype` . lte ( otherValue ) |nbsp| `=> boolean`
    Return true if this is less or equal to *otherValue*.

:sup:`prototype` . gt ( otherValue ) |nbsp| `=> boolean`
    Return true if this is greater than *otherValue*.

:sup:`prototype` . gte ( otherValue ) |nbsp| `=> boolean`
    Return true if this is greater than or equal to *otherValue*.

:sup:`prototype` . isZero ( ) |nbsp| `=> boolean`
    Return true if this is equal to zero.

:sup:`prototype` . toNumber ( ) |nbsp| `=> number`
    Return a JavaScript number of the value.

    An error is thrown if the value is outside the safe range for JavaScript
    IEEE 754 64-bit floating point numbers (over 53 bits of mantissa).

:sup:`prototype` . toString () |nbsp| `=> string`
    Return a decimal string representation.

:sup:`prototype` . toHexString ( ) |nbsp| `=> hex`
    Return a hexstring representation of the value.


Creating Instances
******************

:sup:`utils` . bigNumberify ( value ) |nbsp| :sup:`=> BigNumber`
    Returns a BigNumber instance of *value*. The *value* may be anything that can
    reliably be converted into a BigNumber:

    ============================ ======================= =================================
    Type                         Examples                Notes
    ============================ ======================= =================================
    decimal string               ``"42"``, ``"-42"``
    hexadecimal string           ``"0x2a"``, ``"-0x2a"`` case-insensitive
    numbers                      ``42``, ``-42``         must be witin the `safe range`_
    :ref:`Arrayish <arrayish>`   ``[ 30, 252 ]``         big-endian encoding
    BigNumber                    any other BigNumber     returns the same instance
    ============================ ======================= =================================

.. code-block:: javascript
    :caption: *examples*

    let value = utils.bigNumberify("12345678901234567890");
    let rate = utils.bigNumberify(3000000);

    let finalValue = value.mul(rate);
    console.log("Final value: " + finalValue.toString());
    // Final value: 37037036703703703670000000

    console.log("Number: " + finalValue.toNumber());
    // throws an Error, the value is too large for JavaScript to handle safely

-----

.. _bytes32string:

Bytes32 Strings
###############

Often for short strings, it is far more efficient to store them as
a fixed, null-terminated bytes32, instead of a dynamic length-prefixed
bytes.

:sup:`utils` . formatBytes32String ( text ) |nbsp| `=> hex`
    Returns a :ref:`hex string <hexstring>` representation of *text*, exactly
    32 bytes wide. Strings **must** be 31 bytes or shorter, or an exception
    is thrown.

    **NOTE:** Keep in mind that UTF-8 characters outside the ASCII range can
    be multiple bytes long.

:sup:`utils` . parseBytes32String ( hexStringOrArrayish ) |nbsp| `=> string`
    Returns *hexStringOrArrayish* as the original string, as generated by ``formatBytes32String``.

.. code-block:: javascript
    :caption: *example*

    let text = "Hello Blockchain!"

    let bytes32 = utils.formatBytes32String(text)
    // "0x48656c6c6f20426c6f636b636861696e21000000000000000000000000000000"

    let originalText = utils.parseBytes32String(bytes32)
    // "Hello Blockchain!"

-----

.. _constants:

Constants
#########

:sup:`mxw . constants` . AddressZero
    The address ``mxw000000000000000000000000000000000000000``.

:sup:`mxw . constants` . HashZero
    The bytes32 ``0x0000000000000000000000000000000000000000000000000000000000000000``.

:sup:`mxw . constants` . MaxUint256
    The bytes32 ``0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff``.

:sup:`mxw . constants` . NegativeOne
    The :ref:`BigNumber <bignumber>` ``bigNumberify(-1)``.

:sup:`mxw . constants` . Zero
    The :ref:`BigNumber <bignumber>` ``bigNumberify(0)``.

:sup:`mxw . constants` . One
    The :ref:`BigNumber <bignumber>` ``bigNumberify(1)``.

:sup:`mxw . constants` . Two
    The :ref:`BigNumber <bignumber>` ``bigNumberify(2)``.

:sup:`mxw . constants` . CinPerMxw
    The :ref:`BigNumber <bignumber>` ``bigNumberify("1000000000000000000")``.

-----

Cryptographic Functions
#######################

Elliptic Curve
**************

:sup:`utils` . computeAddress ( publicOrPrivateKey ) |nbsp| `=> Address`
    Computes the address given a public key or private key.

:sup:`utils` . computePublicKey ( publicOrPrivateKey [ , compressed :sup:`= false` ] ) |nbsp| `=> hex`
    Compute the public key for *publicOrPrivateKey*, optionally *compressed*. If
    *publicOrPrivateKey* is a public key, it may be either compressed or uncompressed.

:sup:`utils` . recoverAddress ( digest , signature [ , recoveryParam ] ) |nbsp| `=> Address`
    Returns the address by using ecrecover with the *digest* for the
    *signature*.

:sup:`utils` . recoverPublicKey ( digest , signature [ , recoveryParam ] ) |nbsp| `=> hex`
    Returns the public key by using ecrecover with the *digest* for the *signature*.

:sup:`utils` . recoverPublicKey ( digest , signature [ , recoveryParam ] ) |nbsp| `=> hex`
    Returns the public key by using ecrecover with the *digest* for the *signature*.

:sup:`utils` . verifyMessage ( messageStringOrArrayish , signature [ , recoveryParam ] ) |nbsp| `=> Addresss`
    Returns the address of the account that signed *messageStringOrArrayish* to
    generate *signature*.

:sup:`utils` . verify ( messageStringOrArrayish , signature, address ) |nbsp| `=> Boolean`
    Returns true if the signature is signed by the address.

.. code-block:: javascript
    :caption: *verify a message signature*

    let privateKey = "0xca250aeca008d36b4b4ff83709343c9e4c4ea461e5aa5fa51d57a0fe11eb045e";
    let wallet = new mxw.Wallet(privateKey);
    let message = "Hello Blockchain!";

    return wallet.signMessage(message, true).then((signature) => {
        let address = utils.verifyMessage(message, signature);
        console.log("Signed by:", address);
        // mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x
    });

Hash Functions
**************

:sup:`utils` . sha256 ( hexStringOrArrayish ) |nbsp| `=> hex`
    Compute the SHA2-256 cryptographic hash of a value, returned as a hex string.

.. code-block:: javascript
    :caption: *hashing binary data*

    console.log(utils.sha256([ 0x12, 0x02 ]));
    // "0xa8b1b4fe0930de4baff9b55286f7ba78edbcb3f2b18f6ad7e9336c541bf60515"

    console.log(utils.sha256("0x1202"));
    // "0xa8b1b4fe0930de4baff9b55286f7ba78edbcb3f2b18f6ad7e9336c541bf60515"


Hash Function Helpers
*********************

:sup:`utils` . hashMessage ( stringOrArrayish ) |nbsp| `=> hex`
    Compute the SHA2-256 value by converting the message to bytes (as necessary).

:sup:`utils` . id ( utf8String ) |nbsp| `=> hex`
    Compute the SHA2-256 cryptographic hash of a UTF-8 string, returned as a hex string.

.. code-block:: javascript
    :caption: *hashing utf-8 strings*

    // Convert the string to binary data
    let message = "Hello Blockchain!";
    let messageBytes = utils.toUtf8Bytes(message);
    console.log(utils.sha256(messageBytes));
    // "0xdc2a5349136fe31362ddca95d7f8d3adb35c8eb3261f39ff519b1e33988a3b1f"

    // Which is equivalent to using the id function
    console.log(utils.id("Hello Blockchain!"));
    // "0xdc2a5349136fe31362ddca95d7f8d3adb35c8eb3261f39ff519b1e33988a3b1f"

Key Derivation
**************

.. _pbkdf2:

:sup:`utils` . pbkdf2 ( password , salt , iterations , keylen , hashAlgorithm )
    Return the pbkdf2 derived key from *password* and *salt* with *iterations* of
    *length* using the *hashAlgorithm*. The supported hash algorithms are ``sha256``
    and ``sha512``.

Random
******

:sup:`utils` . randomBytes ( length ) |nbsp| `=> Uint8Array`
    Return a Uint8Array of cryptographically secure random bytes

.. code-block:: javascript
    :caption: *generate random bytes*

    let randomBytes3 = utils.randomBytes(3)
    // Uint8Array [ 127, 203, 43 ]

    let randomBytes32 = utils.randomBytes(32)
    // Uint8Array [ 150, 131, 148, 78, 45, 225, 72, 89, 145, 104, 97, 29,
    //              252, 55, 70, 88, 203, 255, 151, 106, 241, 106, 1, 87,
    //              3, 109, 34, 166, 122, 132, 176, 209 ]


.. code-block:: javascript
    :caption: *generate a random number*

    let randomNumber = utils.bigNumberify(utils.randomBytes(32));
    // BigNumber { _hex: 0x5de9cfc233211c316be4a1eb0fd6d9f8244386a704681310a8f59a4b7cebe2a5 }


Mxw Strings and Cin
##################

.. _parseMxw:

:sup:`utils` . parseMxw ( mxwString ) |nbsp| `=> BigNumber`
    Parse the *mxwString* representation of mxw into a BigNumber instance
    of the amount of cin.

.. _formatMxw:

:sup:`utils` . formatMxw ( cin ) |nbsp| `=> string`
    Format an amount of *cin* into a decimal string representing the amount of mxw.
    The output will always include at least one whole number and at least one decimal
    place, otherwise leading and trailing 0's will be trimmed.

.. _parseUnits:

:sup:`utils` . parseUnits ( valueString , decimalsOrUnitName ) |nbsp| `=> BigNumber`
    Parse the *valueString* representation of units into a BigNumber.
    The *decimalsOrUnitsName* may be a number of decimals between 3 and 18 (multiple of 3).

.. _formatUnits:

:sup:`utils` . formatUnits ( value , decimalsOrUnitName ) |nbsp| `=> string`
    Format an amount into a decimal string representing the amount of units. 
    The output will always include at least one whole number and at least one decimal place,
    otherwise leading and trailing 0's will be trimmed. The *decimalsOrUnitsName*
    may be a number of decimals between 3 and 18 (multiple of 3).

:sup:`utils` . commify ( numberOrString ) |nbsp|  `=> string`
    Returns *numberOrString* with commas placed at every third position within the whole
    component. If *numberOrString* contains a decimal point, the output will as well with
    at least one digit for both the whole and decimal components. If there no decimal,
    then the output will also not contain a decimal.


.. code-block:: javascript
    :caption: *examples*

    let value = utils.parseMxw('1000.0');
    console.log(value.toString());
    // "1000000000000000000000"

    console.log(utils.formatMxw(0));
    // "0.0"

    let cin = utils.bigNumberify("1000000000000000000000");

    console.log(utils.formatMxw(cin));
    // "1000.0"

    console.log(utils.commify(cin.toString()));
    // "1,000,000,000,000,000,000,000"

-----

.. _hexstring:

Hex Strings
###########

A hex string is **always** prefixed with "0x" and consists of the characters
0 -- 9 and a -- f. It is always returned lower case with even-length, but any hex
string passed into a function may be any case and may be odd-length.

:sup:`utils` . hexlify ( numberOrBigNumberOrHexStringOrArrayish ) |nbsp| `=> hex`
    Converts any number, :ref:`BigNumber <bignumber>`, hex string or
    `Arrayish`_ to a hex string. (otherwise, throws an error)

:sup:`utils` . isHexString ( value ) |nbsp| `=> boolean`
    Returns true if *value* is a valid hexstring.

:sup:`utils` . hexDataLength ( hexString ) |nbsp| `=> number`
    Returns the length (in bytes) of *hexString* if it is a valid data hexstring (even length).

:sup:`utils` . hexDataSlice ( hexString , offset [ , endOffset ] ) |nbsp| `=> hex`
    Returns a string for the subdata of *hexString* from *offset* **bytes**
    (each byte is two nibbled) to *endOffset* **bytes**. If no *endOffset* is
    specified, the result is to the end of the *hexString* is used. Each byte is two nibbles.

:sup:`utils` . hexStripZeros ( hexString ) |nbsp| `=> hex`
    Returns *hexString* with all leading zeros removed, but retaining at least
    one nibble, even if zero (e.g. ``0x0``). This may return an odd-length string.

:sup:`utils` . hexZeroPad ( hexString , length ) |nbsp| `=> hex`
    Returns *hexString* padded (on the left) with zeros to length **bytes** (each
    byte is two nibbles).

-----

.. _signature:

Signatures
##########

There are two common formats for signatures in Ethereum. The **flat-format**, which
is a hexstring with 65 bytes (with recoveryParam); or a hexstring with 64 bytes
(without recoveryParam); or an **expanded-format**, which is an object with the properties:

    - **r** and **s** --- the (r, s) public point of a signature
    - **recoveryParam** --- the recovery parameter of a signautre (either ``0`` or ``1``)
    - **v** --- the recovery param nomalized (either ``27`` or ``28``)

:sup:`utils` . splitSignature ( hexStringOrArrayishOrSignature ) |nbsp| `=> Signature`
    Returns an expanded-format signature object for *hexStringOrArrayishOrSignature*.
    Passing in an signature that is already in the expanded-format will ensure
    both *recoveryParam* and *v* are populated.

:sup:`utils` . joinSignature ( signature [ , includeRecoveryParam ] ) |nbsp| `=> hex`
    Returns the flat-format signature hexstring of *signature*. The final *v*
    byte will always be normalized to ``0x1b`` of ``0x1c``. Optionally to include
    recovery param.

.. code-block:: javascript
    :caption: *To Expanded-Format*

    // Flat-format; this is the format provided by JSON-RPC responses
    let flat = "0xd26c2cd5c6adb03046ac99e5d9badb798ca9b09f995191b5b906d6c26f8983e4" +
                 "1b7116df50a27a8c9e52fae512728ef75623da13320ca9b2e62ece0dcdd409e9" +
                 "1b";
    let expanded = utils.splitSignature(flat);

    console.log(expanded);
    // { r: "0xd26c2cd5c6adb03046ac99e5d9badb798ca9b09f995191b5b906d6c26f8983e4",
    //   s: "0x1b7116df50a27a8c9e52fae512728ef75623da13320ca9b2e62ece0dcdd409e9",
    //   recoveryParam: 0,
    //   v: 27
    // }

.. code-block:: javascript
    :caption: *To Flat-Format*

    // Expanded-format; this is the format and other tools often require
    let expanded = {
        r: "0xd26c2cd5c6adb03046ac99e5d9badb798ca9b09f995191b5b906d6c26f8983e4",
        s: "0x1b7116df50a27a8c9e52fae512728ef75623da13320ca9b2e62ece0dcdd409e9",
        recoveryParam: 0,
        v: 27
    }
    let flat = utils.joinSignature(expanded, true);

    console.log(flat)
    // "0xd26c2cd5c6adb03046ac99e5d9badb798ca9b09f995191b5b906d6c26f8983e4"
    // "1b7116df50a27a8c9e52fae512728ef75623da13320ca9b2e62ece0dcdd409e91b"

-----

.. _utf8-strings:

UTF-8 Strings
#############

.. _utf8-to-bytes:

:sup:`utils` . toUtf8Bytes ( string ) |nbsp| `=> Uint8Array`
    Converts a UTF-8 string to a Uint8Array.

.. _utf8-to-string:

:sup:`utils` . toUtf8String ( hexStringOrArrayish [ , ignoreErrors :sup:`= false` ] ) |nbsp| `=> string`
    Converts a hex-encoded string or array to its UTF-8 representation.

.. code-block:: javascript
    :caption: *To UTF-8 Bytes*

    let text = "Hello Blockchain!";
    let bytes = utils.toUtf8Bytes(text);

    console.log(bytes);
    // Uint8Array [ 72, 101, 108, 108, 111, 32, 66, 108, 111, 99, 107, 99, 104, 97, 105, 110, 33 ]

.. code-block:: javascript
    :caption: *To UTF-8 String*

    let array = [ 72, 101, 108, 108, 111, 32, 66, 108, 111, 99, 107, 99, 104, 97, 105, 110, 33 ];
    let stringFromArray = utils.toUtf8String(array);

    console.log(stringFromArray);
    // "Hello Blockchain!"

    let hexString = "0x48656c6c6f20426c6f636b636861696e21";
    let stringFromHexString = utils.toUtf8String(hexString);

    console.log(stringFromHexString);
    // "Hello Blockchain!"

-----

.. _safe range: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger
.. _BIP-173: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki

.. EOF