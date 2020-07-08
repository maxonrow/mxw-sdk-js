*********
Tutorial
*********

This is a small (but growing) collection of simple recipes to perform common tasks
with the Maxonrow blockchain.

If there is a simple recipe you would like to add, please send suggestions to support@maxonrow.com.

-----

**Learning Objectives:**

This tutorial will show you how to create a list of sample methods used in Online Learning application. TypeScript will be usedas the example 
programming language. This tutorial assumes some basic understanding of blockchain.

-----

**Prerequisites:**

Before proceeding, make sure you have installed:

| * `VS Code`_ version 1.42 or newer
| * `Node.js`_ v10.x or newer 
| * `npm`_ v6.x or newer (will be installed alongside node)

You can check your installed versions by running the following commands from a terminal:
| ``node --version``
| ``npm --version``

-----

Flight Ticketing System Tutorial
################################

Introduction:
   This tutorial shows various basic usage of mxw-sdk-js in creating a flight ticketing system. 

**1. Initial setup**
********************

To begin, let's set up project directory such as:

|  /`flight-ticket-tutorial`
|     /`src`
|     /`package.json`

Create a new file name 'flight-ticket.ts' in folder [`/flight-ticket-tutorial/src/`].

**2. Create NFT**
*****************
Firstly, we need to create an NFT. In this case, the airline is responsible for creating the NFT.

.. code-block:: javascript

   //set NFT properties
   let ntfProperties = {
      name: "my2sgFlightTicket05",
      symbol: "my2sg05",
      fee: {
         to: "mxw1qgwzdxf66tp5mjpkpfe593nvsst7qzfxzqq73d",
         value: bigNumberify("1")
      },
      properties: "fMYtSG@5",
      metadata: "nothing"
   };

   //create NFT token using properties shown above
   token.NonFungibleToken.create(ntfProperties,issuer).then((token)=>{
      console.log(JSON.stringify(token))
   });

.. note:: properties **can't** be changed afterwards, it can use as a notes for imporant details,while metadata **can** be changed. 

**3. Query NFT**
****************
After the NFT is created we can use ``fromSymbol()`` method to query the NFT, and get its details.

.. code-block:: javascript

   //Query token, to update/ refresh all data of the token
   mxw.nonFungibleToken.NonFungibleToken.fromSymbol("my2sg05",issuer).then((token)=>{
      console.log(JSON.stringify(token))
   });


**3. Authorise NFT**
********************
Before the NFT can be use inside Maxonrow blockchain, it have to be authorized by three parties
(provider, issuer and middleware). 

.. code-block:: javascript

   //setup token state in order to authorise token
   let tokenState = {
      tokenFees: [
         { action: NonFungibleTokenActions.transfer, feeName: "default" },
         { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
         { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" }
      ],
      endorserList: [],
      mintLimit: 10,
      transferLimit: 1,
      burnable: false,
      pub: false
   };

   //authorise token
   token.NonFungibleToken.approveNonFungibleToken("my2sg05", provider, tokenState).then((transaction) => {
      token.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
         token.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
               console.log("approve"+receipt);
         });
      });
   });


**4. Mint NFT item**      
********************
After the NFT is authorized, the owner(airline) can start to mint items (print out tickets) to the passenger.

.. code-block:: javascript

   //setup item properties
   let itemPro = {
   symbol: "my2sg05",
   itemID: "004",
   properties: "from05,to06",
   metadata:" nothing"
   };

   //mint item using the token created earlier by passing in the item properties
   var minter = new NonFungibleToken("my2sg05",issuer);
   minter.mint(issuer.address,itemPro).then((receipt)=>{
   console.log(JSON.stringify(receipt));
   });      

**5. Transfer NFT item**
************************
After the item is created, it will be owned by the NFT owner. So we have to transfer it to the passenger's wallet.

.. code-block:: javascript

   //transfer item
   var nonFungibleTokenItem = new NonFungibleTokenItem("my2sg05","001", issuer);
    nonFungibleTokenItem.transfer(wallet.address).then((receipt) => {
        console.log(receipt);
    })

**6. Endorse item**
*******************
On passenger boarding the plane, we can endorse the item by doing so we can ensure that the passenger, 
has been on the plane. 

.. code-block:: javascript

   //endorse item
   var nftInstance = new NonFungibleTokenItem("my2sg05","001", issuer);
   nftInstance.endorse().then((receipt) => {
         console.log(receipt);
   });

**7. Overwrite the metadata**
*****************************
As we mentioned earlier, both metadata of the NFT and item can be change by using ``updateMetadata()`` method.
For this case we will overwrite the item metadata. 

.. code-block:: javascript

   //overwrite the item metadata with string "overwrite"
   nftInstance.updateMetadata("overwrite")

   var nftItemStatus;
   nftInstance.getState().then((result)=>{
      nftItemStatus = result.metadata;
   });

**8. Add new info into the metadata**
*************************************
If we query the item metadata and cache it first. We can adding new infomation on exsiting metadata.

.. code-block:: javascript

   var nftItemStatus;
   nftInstance.getState().then((result)=>{
      nftItemStatus = result.metadata;
   });

   //adding new info into the item metadata
   nftInstance.updateMetadata(nftItemStatus+ "adding new").then((receipt)=>{
      console.log(receipt.status);
   });
   nftInstance.getState().then((result)=>{
      nftItemStatus = result.metadata;
   });


**9. Freeze item**
*******************
In some cases, we might have to cancel or delay the flight. We can use the *freeze* the item to prevent owner 
using it, but this operation must be authorized by three parties.

.. code-block:: javascript

   //freeze item
   token.NonFungibleToken.freezeNonFungibleTokenItem("my2sg05","003",provider).then((transaction) => {
      token.NonFungibleToken.signNonFungibleTokenItemStatusTransaction(transaction, issuer).then((transaction) => {
         token.NonFungibleToken.sendNonFungibleTokenItemStatusTransaction(transaction, middleware).then((receipt) => {
               console.log(JSON.stringify(receipt));
               return receipt
         });
      });
   });


**10. Unfreeze item**
*********************
After the freezing, we can *unfreeze* it back. As unfreeze and freeze are administrative operation, it must be 
authorized by three parties.

.. code-block:: javascript

   //unfreeze item
   token.NonFungibleToken.unfreezeNonFungibleTokenItem("my2sg05","003",provider).then((transaction) => {
      token.NonFungibleToken.signNonFungibleTokenItemStatusTransaction(transaction, issuer).then((transaction) => {
         token.NonFungibleToken.sendNonFungibleTokenItemStatusTransaction(transaction, middleware).then((receipt) => {
               console.log(JSON.stringify(receipt));
               return receipt
         });
      });
   });


**11. Burn item**
*****************
At last, the owner of the item can choose to burn the item(ticket) he owned.

.. code-block:: javascript

   //burn item
   var nftInstance = new NonFungibleTokenItem("my2sg05","005", issuer);
   nftInstance.burn().then((receipt) => {
      console.log(JSON.stringify(receipt));
   });


.. note:: 
   | Flight Ticketing System tutorial is organized like a module. To run the code, first compile using ``tsc``, then run with command:
   |  ``node dist/flight-ticket.js``

--------

Online Learning Tutorial
########################

Introduction:
   This tutorial create a simple Online Learning application. The functions included here are: enrol student, add and approve course, student enrol to course.

**1. Initial setup**
********************

To start with, we'll setup project directory like the following:

|  /`online-learning-tutorial`
|     /`src`
|     /`package.json`


.. note:: 
   You can create `package.json` file using `npm init` command.
   
   | 1. On the command line, navigate to the root directory of your package      
   |    ``cd /path/to/OnlineLearning``

   | 2. Run the following command:      
   |    ``npm init``

   | 3. Answer the questions in the command line questionnaire

Please refer to :ref:`Getting Started<start>` guide "Installing in Node.js" to include mxw-sdk-js library in the project. 

Let's start by creating a file named `online-learning.ts` in folder [`/online-learning-tutorial/src`]. 

**2. Enrol new Student (create new Wallet instance)**
*****************************************************

:ref:`Wallet <wallet>` is an "account" created by each user inside Maxonrow blockchain. But for this tutorial,
the wallet instance will represent student who wants to enroll this online course.
   
.. code-block:: javascript

   registerNewStudent() {
      // create wallet instance
      let student: mxw.Wallet = mxw.Wallet.createRandom();

      console.log("Wallet address:", student.address);
      // sample output: mxw18mt86al0xpgh2qhvyeqgf8m96xpwz55sdfwc8n
      console.log("Wallet mnemonic:", student.mnemonic);
      // sample output: unaware timber engage dust away host narrow market hurry wave inherit bracket

      // connect to provider
      student.connect(this.providerConn);
   }


Once a Wallet is created using ``createRandom()`` method, we can use the Wallet ``fromMnemonic()`` method to 
load an instance of the wallet that we just created.

.. code-block:: javascript

   let student: mxw.Wallet = mxw.Wallet.fromMnemonic("unaware timber engage dust away host narrow market hurry wave inherit bracket");

.. note:: For various options on how to create a Wallet instance, please refer to :ref:`Wallet <wallet>` SDK. This tutorial is using simplest way to create Wallet instance.

``connect()`` - to connect the Wallet instance to :ref:`Provider <api-provider>`.
     
 
**3. Add new course**
**********************

:ref:`Non-Fungible-Token (NFT) <api-nft>` is a token created and hold by a course owner, it can use to mint item
(create seats) to the student who wants to attend the course.

| Please note that the NFT properties `symbol` must be unique. 
| If we attempt to create NFT using same symbol, an error will be thrown. 

.. code-block:: javascript

   createNewCourse(courseName: string) {

      nonFungibleTokenProperties = {
         name: courseName,
         symbol: courseName,
         fee: {
               to: nodeProvider.nonFungibleToken.feeCollector,
               value: bigNumberify("1")
         },
         metadata: "Course " + courseName,
         properties: courseName
      };

      // create NFT using above properties
      return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
         console.log("Symbol:", nonFungibleTokenProperties.symbol);
      });
   }

   
If we want to check on the course details, we can use the symbol to query the NFT.
   
.. code-block:: javascript

   var minter = new NonFungibleToken(courseSymbol, issuer);


**4. Approve course**
*********************

Before the course owner can start to mint item, the NFT must be authorized by three parties, 
(provider, issuer and middleware). 
As part the procedure of authorization, inside the ``approveNonFungibleToken()`` method, we need to pass in the NFT state. 

.. code-block:: javascript

   approveCourse(courseSymbol: string, seatLimit: number) {
      let nftState = {
         tokenFees: [
               { action: NonFungibleTokenActions.transfer, feeName: "default" },
               { action: NonFungibleTokenActions.transferOwnership, feeName: "default" },
               { action: NonFungibleTokenActions.acceptOwnership, feeName: "default" }
         ],
         endorserList: [],
         mintLimit: seatLimit,
         transferLimit: 1,
         burnable: true,
         transferable: true,
         modifiable: true,
         pub: false   // not public
      };

      // provider approves NFT, at same time, set NFT with above state
      return token.NonFungibleToken.approveNonFungibleToken(courseSymbol, provider, nftState)
         .then((transaction) => {
               // issuer signs NFT status transaction
               return token.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer);
         }).then((transaction) => {
               // middleware sends NFT NFT status transaction
               return token.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware)
                  .then((receipt) => {
                     console.log(receipt);
                     return receipt;
                  });
         });
   }


**5. Student enrol course**
******************************

In this part will performs two actions:

| 1. Mint an item (issue course entry pass)
| 2. Transfer item to wallet (transfer entry pass to student)

.. code-block:: javascript

   enrolStudentToCourse(student: mxw.Wallet, courseSymbol: string, theId: number) {
      return this.mintItem(courseSymbol, theId) // mint course entry pass
         .then((nftItem) => {
               let itemId = courseSymbol + "#" + theId;
               return this.transferItem(nftItem, itemId, student); // transfer pass to student
         })
         .catch(error => { // handle error, if any
               console.log("enrolStudentToCourse", error);
               throw error;
         });
   }


``mintItem()`` method mints an item. 
When item is created, by default it will be owned by the NFT token owner. 
A token can't mint item more that its mint limit. 
The item's symbol must same the course symbol.
Use ``getNftItemState()`` method to queries and prints out the NFT item state.

.. code-block:: javascript

   mintItem(courseSymbol: string, theId: number) { // query NFT created before
      var minter = new NonFungibleToken(courseSymbol, issuer);
      let itemId = courseSymbol + '#' + theId;
      let properties = "Course " + courseSymbol + " - Seat #" + theId;
      let itemProp = {
         symbol: courseSymbol, // value must be same with NFT symbol, the parent
         itemID: itemId, // value must be unique for same NFT
         properties: properties,
         metadata: properties
      } as token.NonFungibleTokenItem;

      // mint item to issuer wallet, with item properties defined above
      return minter.mint(issuer.address, itemProp)
         .then((receipt) => {
               console.log("Mint item receipt:", receipt);
               return NonFungibleTokenItem.fromSymbol(courseSymbol, itemId, issuer);
         }).then((nftItem) => {
               return this.getNftItemState(nftItem); // print out the NFT item state
         })
         .catch(error => { // handle error, if any
               console.log("mintItem", error);
               throw error;
         });
   }


``transferItem()`` transfers NFT item ownership to the recipient wallet, in this case, the student. 
``overrides`` is optional when transferring item.

.. code-block:: javascript

   transferItem(nftItem: NonFungibleTokenItem, itemId: string, student: mxw.Wallet) {
      let overrides = { memo: itemId + " transferred to " + student.address }; // optional

      // transfer NFT item to student
      return nftItem.transfer(student.address, overrides)
         .then((receipt) => {
               console.log("Transfer NFT item receipt:", JSON.stringify(receipt));
               return nftItem;
         }).then((nftItem) => {
               return this.getNftItemState(nftItem); // print out the NFT item state
         })
         .catch(error => { // handle error, if any
               console.log("transferItem", error);
               throw error;
         });
   }


``getNftItemState()`` queries and prints out the NFT item state.

.. code-block:: javascript

   getNftItemState(nftItem: NonFungibleTokenItem) {
      return nftItem.getState() // query NFT item state
         .then((itemState) => {
               console.log("Item state:", JSON.stringify(itemState)); // print NFT item state
               return nftItem;
         })
         .catch(error => { // handle error, if any
               console.log("getNftItemState", error);
               throw error;
         });
   }


.. note:: 
   | Online Learning tutorial is organized into methods for individual functions, so you can pass in different parameters to see how things work. To run the code, first compile using ``tsc``, then run with command:
   |  ``node dist/online-learning.js <method_name>``

   | Third argument is the method to call, followed by the method's parameter(s), if any. For example, below command shows how we can trigger ``addCourse()`` method using parameter `Art`:
   |  ``node dist/online-learning.js addCourse Art``


For complete source code, please download from here `GitHub`_.

-----

.. _VS Code: https://code.visualstudio.com/
.. _Node.js: https://nodejs.org/en/download/
.. _npm: https://nodejs.org/en/download/
.. _GitHub: https://github.com/GeokTuanTeh/online-learning