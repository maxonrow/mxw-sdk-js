.. _start:

***************
Getting Started
***************

| The mxw-sdk-js library is a compact and complete JavaScript library for Maxonrow blockchain.

-----

Setup
#####

Learn how to set up environment & create project.

Installing in Node.js
---------------------

Install the mxw-sdk-js library from your project directory::

   $ npm install --save mxw-sdk-js

Importing
---------

.. code-block:: javascript
    :caption: *JavaScript (ES3)*

    var mxw = require('mxw-sdk-js');

.. code-block:: javascript
    :caption: *JavaScript (ES5 or ES6)*

    const mxw = require('mxw-sdk-js');

.. code-block:: javascript
    :caption: *JavaScript (ES6) / TypeScript*


    import { mxw } from 'mxw-sdk-js';

Including in React Native
"""""""""""""""""""""""""

.. code-block:: javascript
    :caption: *JavaScript (ES6) / TypeScript*

    import { mxw } from 'mxw-sdk-js';

Including in React
------------------

.. code-block:: javascript
    :caption: *JavaScript (ES6) / TypeScript*

    import { mxw } from 'mxw-sdk-js';

Including in Vue.js
"""""""""""""""""""

.. code-block:: javascript
    :caption: *JavaScript (ES6) / TypeScript*

    import { mxw } from 'mxw-sdk-js';

Including in Web Applications
"""""""""""""""""""""""""""""

For security purposes, it is usually best to place a **copy** of `this script`_ on
the application's server; but using the Maxonrow content distribution network (CDN) 
should suffice for a quick prototype.

.. code-block:: html
    :caption: *HTML*

    <!-- This exposes the library as a global variable: mxw -->
    <script src="https://cdn.maxonrow.com/scripts/mxw-sdk-js-v1.min.js"
            charset="utf-8"
            type="text/javascript">
    </script>

-----


.. _npm is installed: https://nodejs.org/en/
.. _this script: https://cdn.ethers.io/scripts/ethers-v4.min.js

