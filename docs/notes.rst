Guidances
*********

A few quick notes about some of the less obvious aspects of interacting with
Maxonrow in JavaScript.

-----

.. _console-log:

console.log
===========
    The use of ``console.log`` `can substantially impact performance`_.
    For this reason, you may wish to reduce the log level to not show info and warnings.

.. code-block:: javascript
    :caption: *change Log Level*

    // The default is "info"; other options
    // "debug", "info", "warn", "error", "off"
    mxw.errors.setLogLevel("error");


.. _ieee754:

Why can't I just use numbers?
=============================

The first problem many encounter when dealing with Maxonrow is the concept of numbers. Most
common currencies are broken down with very little granularity. For example, there are only
100 cents in a single dollar. However, there are  10\ :sup:`18` **cin** in a single
**mxw**.

JavaScript uses `IEEE 754 double-precision binary floating point`_ numbers to represent
numeric values. As a result, there are *holes* in the integer set after
9,007,199,254,740,991; which is problematic for *Maxonrow* because that is only
around 0.009 mxw (in cin).

To demonstrate how this may be an issue in your code, consider::

    > (Number.MAX_SAFE_INTEGER + 4 - 5) == (Number.MAX_SAFE_INTEGER - 1)
    false


To remedy this, all numbers (which can be large) are stored and manipulated
as :ref:`Big Numbers <bignumber>`.

The functions :ref:`parseMxw( mxwString ) <parseMxw>` and :ref:`formatMxw( cin ) <formatMxw>` can be used to convert between
string representations, which are displayed to or entered by the user and Big Number representations
which can have mathematical operations handled safely.

-----

.. _promise:

Promises
========

A `Promise in JavaScript`_ is an object which simplifies many aspects of dealing with
asynchronous functions.

It allows a pending result to be treated in many ways as if it has already been resolved.

The most useful operations you will need are:

:sup:`Promise` . all ( promises )
    Returns a new promise that resolves once all the *promises* have resolved.

:sup:`prototype` . then ( onResolve, onReject )
    Returns another Promise, which once the Promise was resolved, the *onResolve*
    function will be executed and if an error occurs, *onReject* will be called.

    If *onResolve* returns a Promise, it will be inserted into the chain of the returned
    promise. If *onResolve* throws an Error, the returned Promise will reject.

.. code-block:: javascript
    :caption: *get account details in JavaScript*

    var mxw = require('mxw-sdk-js');

    var targetAddress = "mxw1x7tp9tt7mu0jm6qdmljgntvzzp53lrtndr7h8x";
    var provider = mxw.getDefaultProvider();

    // Promises that we are interested in
    var balancePromise = provider.getBalance(targetAddress);
    var transactionCountPromise = provider.getTransactionCount(targetAddress);

    var allPromises = Promise.all([
        balancePromise,
        transactionCountPromise
    ]);

    var sendPromise = allPromises.then(function(results) {
         // This function is ONLY called once ALL promises are fulfilled

         var balance = results[0];
         var transactionCount = results[1];

         return {
            balance,
            transactionCount
         };
    });

    sendPromise.then(function(account) {
        // This will be called once the details is available
        console.log("Address:", targetAddress);
        console.log("Balance:", account.balance.toString());
        console.log("Nonce:", account.transactionCount().toString());
    });

-----

Contributing
============

I fully welcome anyone to contribute to the project, and appreciate all the
help I can get. That said, if you have ideas for a PR, please discuss them
as an issue on GitHub first.

A few notes on contributing.

- An important feature of mxw-sdk-js is that it is small, which means uncommon features or large features need a great deal of discussion.
- Dependencies; part A) in line with the above, "keep things small", adding a dependency is a big deal, as they often bring many other packages with them. A great deal of effort has been used to tune the build process and dependency list to keep things tight
- Dependencies; part B) adding additional third party libraries, adds a huge attack vector fun malicious code or unexpected consequences, so adding a dependency is certainly something that needs to be very convincingly argued.
- Dependencies; part C) part B applies to dev dependencies too. A devDependency can inject or otherwise do strange things and increases the attack vector for bugs and malicious code
- Changing filenames or breaking backwards compatibility is a no-go for minor version changes
- Major version changes do not happen often. We place @TODO in the source code for things that will be updated at the next version change.
- Please use the GitHub issue system to make requests, or discuss changes you would like to make.
- Testing is a must. It should generally take you longer to write test cases than it does the actual code.
- All test cases must pass on all platforms supported.

-----

Security
========

A lot of people store a lot of value in Ethereum and the code that runs it. As
such, security is important.


The GitHub and NPM Package
--------------------------

The keys used to sign code on GitHub are well protected, but anyones computer
can be compromised.

All services involved have two-factor authentication set up, but please keep in
mind that bleeding-edge technology should probably not be used in production
environments.

Keep in mind, however, that at the end of the day, if NPM were hacked, anything
in the system could be replaced.

By using a version that is perhaps a few weeks old, providing there are no
advisories otherwise, there has been adequate time for any compromise to have
been broadcast.

Also, one of the test cases verifies the deterministic build on Continuous Integration (CI). **Never**
install a version which has failed the CI tests.

Long story short, be careful.

In the event of any significant issue, it will be posted on the README.md file,
have an issue posted, with ALL CAPS in the title and will be broadcast on the
official channels.


Memory Hard Brute-Force Encrpyting
----------------------------------

A topic that often comes up is the poor performance of decrypting Wallet.

While it may not be immediately obvious, this is intentional for security
purposes.

If it takes the legitimate user, who knows the password 5 seconds or so to
unlock their account, that means that an attacker must spend 5 seconds per
password attempt, so to guess a million passwords, requires 5 million
seconds. Client software can streamline the process by using Secure Enclaves
or other secure local places to store the decrypted wallet to improve the
customer experience past the first decryption.


Responsible Disclosure
----------------------

If you find a critical bug or security issue, please contact
support@maxonrow.com so that we can address it before you make it public.
You will receive credit for the discovery after it is fixed and announced. :)

-----

.. _can substantially impact performance: https://docs.expo.io/versions/latest/react-native/performance/#using-consolelog-statements
.. _IEEE 754 double-precision binary floating point: https://en.wikipedia.org/wiki/Double-precision_floating-point_format
.. _BN.js: https://github.com/indutny/bn.js/
.. _Promise in JavaScript: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

.. EOF