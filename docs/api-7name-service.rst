.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-name-service:

*************
Alias Service
*************

The `Alias Service` allows alias to be assigned to wallet address, making wallet 
addresses easy to remember. Any provider operation that takes an address
may also take an alias.

Alias also provides the ability for a reverse lookup that determines the alias of 
an address (if it was configured).

Creating alias requires authorities approval and verification from authorities, some small fees will also be charged.
Once the application to create an alias is approved, alias will be recorded into blockchain.

Querying
########

:sup:`provider` . resolveName ( name ) |nbsp| `=> Promise<Address>`
    Returns a :ref:`Promise <promise>` that resolves to the address that the *alias*
    resolves to (or *null* is unregistered).

:sup:`provider` . lookupAddress ( address ) |nbsp| `=> Promise<string>`
    Returns a :ref:`Promise <promise>` that resolves to the alias that the *address* resolves
    to (or *null* if unregistered).

.. code-block:: javascript
    :caption: *resolve an alias to an address*

    provider.resolveName("hello").then((address) => {
        console.log("Address:", address);
    });


.. code-block:: javascript
    :caption: *lookup the alias of an address*

    let address = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";
    provider.lookupAddress(address).then(function(name) {
        console.log("Name:", name);
        // "hello"
    });

