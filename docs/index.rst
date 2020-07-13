.. mxw-sdk-js documentation master file, created by
   sphinx-quickstart on Tue Nov 29 10:25:33 2016.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

******************
What is mxw-sdk-js
******************

The mxw-sdk-js library aims to be a complete and compact library for interacting with the Maxonrow blockchain and its ecosystem.

-----

========
Features
========

    - Keep your private keys in your client, **safe** and sound
    - Import and export **JSON wallets**
    - Import and export BIP 39 **mnemonic phrases** (12-word backup phrases) and HD wallets (English, Italian, Japanese, Korean, Simplified Chinese, Traditional Chinese; more coming soon)
    - Connect to Maxonrow nodes over `JSON-RPC`_.
    - **Aliases names** are first-class citizens; it can be used to log in any Maxonrow services 
    - **Complete** functionality for all your Maxonrow needs
    - Extensive **documentation**
    - Large collection of **test cases** which are maintained and added to
    - Fully **TypeScript**-ready, with definition files and full TypeScript source
    - **MIT License** (including ALL dependencies); completely open source, tweak as you please

----

.. toctree::
   :maxdepth: 4
   :caption: Developer Documentation

   getting-started
   api
   cookbook
   notes
   testnet

-----

Acknowledgement
===============

The initial idea was brought over `ethers.js`_, but soon after moving further, this library becomes its own entity.

-----

.. _ethers.js: https://github.com/ethers-io/ethers.js/
.. _JSON-RPC: https://github.com/ethereum/wiki/wiki/JSON-RPC

.. EOF