.. |nbsp| unicode:: U+00A0 .. non-breaking space

.. _api-name-service:

************
Name Service
************

The `Alias Service` allows easy to remember and use names to be
assigned to wallet addresses. Any provider operation which takes an address
may also take an alias.

Alias also provides the ability for a reverse lookup, which determines the name
for an address if it has been configured.

Create alias required authorities approval and verification, and small fees will be charge.
Once the application is approved, alias will be recorded into blockchain.

Querying
########

:sup:`provider` . resolveName ( name ) |nbsp| `=> Promise<Address>`
    Returns a :ref:`Promise <promise>` which resolves to the address of that the *alias*
    resolves to (or *null* is not registered).

:sup:`provider` . lookupAddress ( address ) |nbsp| `=> Promise<string>`
    Returns a :ref:`Promise <promise>` which resolves to the alias that *address* resolves
    to (or *null* if not registered).

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

