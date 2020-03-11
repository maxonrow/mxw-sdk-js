mxw-sdk-js
==========

Aims to be a complete and compact library for interacting with the Maxonrow Blockchain and its ecosystem.

-----

**Features:**

- Keep your private keys in your client, **safe** and sound
- Import and export **JSON wallets**
- Import and export BIP 39 **mnemonic phrases** (12 word backup phrases) and HD Wallets (English, Italian, Japanese, Korean, Simplified Chinese, Traditional Chinese; more coming soon)
- Connect to Maxonrow nodes over `JSON-RPC`.
- **Alias names** are first-class citizens; they can be used anywhere an Maxonrow addresses can be used
- **Complete** functionality for all your Maxonrow needs
- Extensive [documentation](https://docs.maxonrow.com/mxw-sdk-js)
- Large collection of **test cases** which are maintained and added to
- Fully **TypeScript** ready, with definition files and full TypeScript source
- **MIT License** (including ALL dependencies); completely open source to do with as you please

-----

Compiling the source code
-------------------------

To install all dependecies and build the source code run `make build`.


Installing in Node.js
---------------------

Install the mxw-sdk-js library from your project directory::

    npm install --save mxw-sdk-js

Importing
---------

**JavaScript (ES3)**

    var mxw = require('mxw-sdk-js');

**JavaScript (ES5 or ES6)**

    const mxw = require('mxw-sdk-js');

**JavaScript (ES6) / TypeScript**

    import { mxw } from 'mxw-sdk-js';

-----

Acknowledgements
----------------

The initial idea was brought from [ethers.js](https://github.com/ethers-io/ethers.js), but soon after moving further, this library becomes its own beast.
