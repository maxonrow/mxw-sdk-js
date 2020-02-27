******
How To
******

This is a small (but growing) collection of simple recipes to perform common tasks
with the Maxonrow blockchain.

If there is a simple recipe you would like to add, please send suggestions to support@maxonrow.com.

-----

**Learning Objectives:**

This tutorial will show you how to create a list of sample methods used in Online Learning application. We'll use TypeScript as the example language. This tutorial assumes some basic understanding of blockchain.

-----

**Pre-requisites:**

You will need the following installed in order to proceed:

| * `VS Code`_ version 1.42 or greater
| * `Node`_ v10.x or greater 
| * `npm`_ v6.x or greater (will be installed along node)

You can check your installed versions by running the following commands from a terminal:

| ``node --version``
| ``npm --version``

-----

Online Learning Tutorial
########################

Introduction:
   This tutorial create a simple Online Learning application. The functions included here are: enrol student, add and approve course, student enrol to course.

**1. Initial setup**
********************

To start with, we'll setup project directory like the following:

|  /`MaxonrowTutorial`
|     /`src`
|        /`onlinelearning`
|     /`package.json`


.. note:: 
   You can create `package.json` file using `npm init` command.
   
   | 1. On the command line, navigate to the root directory of your package      
   |    ``cd /path/to/OnlineLearning``

   | 2. Run the following command:      
   |    ``npm init``

   | 3. Answer the questions in the command line questionnaire

Please refer to :ref:`Getting Started<start>` guide "Installing in Node.js" to include mxw-sdk-js library in the project. 

Let's start by creating a file named `online-learning.ts` in folder [`/MaxonrowTutorial/src/onlinelearning`]. 

**2. Enrol new Student (create new Wallet instance)**
*****************************************************

In this tutorial, the student is represented by the :ref:`Wallet <wallet>` instance.
   
.. code-block:: javascript

   registerNewStudent() {
      //create wallet instance
      let student: mxw.Wallet = mxw.Wallet.createRandom();

      console.log("Wallet address:", student.address);
      console.log("Wallet mnemonic:", student.mnemonic);

      //connect to provider
      student.connect(this.providerConn);
   }


Once the Wallet instance is created using ``createRandom()``, we can use the Wallet mnemonic to query back the student wallet instance. 

.. code-block:: javascript

   let student: mxw.Wallet = mxw.Wallet.fromMnemonic("where frost endless true say luxury detect clever unusual rich fresh effort");

.. note:: For various options on how to create a Wallet instance, please refer to :ref:`Wallet <wallet>` SDK. This tutorial is using simplest way to create Wallet instance.

``connect()`` is method to connect the Wallet instance to :ref:`Provider <api-provider>`.
     
 
**3. Add new course**
**********************

In this tutorial, the course is represented by :ref:`Non-Fungible-Token (NFT) <api-nft>`. Please note that the NFT properties `symbol` must be unique in the provider connection. If we attempt to create NFT using same symbol, error will be thrown. 

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

      //create NFT using above properties
      return token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
         console.log("Symbol:", nonFungibleTokenProperties.symbol);
      });
   }

   
We can use the symbol to query back this course NFT.
   
.. code-block:: javascript

   var minter = new NonFungibleToken(courseSymbol, issuer);


**4. Approve course**
*********************

Before NFT can mint an item, it has to be approved by three parties, i.e., provider, issuer and middleware. In approval method ``approveNonFungibleToken()``, we also need to pass in NFT state. 

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

      //provider approve NFT, at same time, set NFT with above state
      return token.NonFungibleToken.approveNonFungibleToken(courseSymbol, provider, nftState)
         .then((transaction) => {
               //issuer sign NFT
               return token.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer);
         }).then((transaction) => {
               //middleware send NFT
               return token.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware)
                  .then((receipt) => {
                     console.log(receipt);
                     return receipt;
                  });
         });
   }


**5. Student enrol course (NFT mint item + item transferred to wallet)**
************************************************************************

This method has two parts:

| 1. Cource to issue entry pass to student (i.e. NFT mint item)
| 2. Item transferred to wallet (entry pass transferred to student)

.. code-block:: javascript

   enrolStudentOnCourse(courseSymbol: string, theId: number, student: mxw.Wallet, ) {
      var minter = new NonFungibleToken(courseSymbol, issuer);

      //get mint limit from NFT state
      return minter.getState().then((result) => {
         let mintLimit: number = result.mintLimit.toNumber();
         console.log("Mint Limit:", mintLimit);

         let itemId = courseSymbol + '#' + theId;
         let properties = "Course " + courseSymbol + " - Seat #" + theId;
         let itemProp = {
               symbol: courseSymbol,
               itemID: itemId,
               properties: properties,
               metadata: properties
         } as token.NonFungibleTokenItem;

         console.log("Minting item:", itemId);
         let nftItem: NonFungibleTokenItem;

         //mint item
         return minter.mint(issuer.address, itemProp).then((receipt) => {
               console.log("Mint Receipt:", JSON.stringify(receipt));

               //query item
               return NonFungibleTokenItem.fromSymbol(courseSymbol, itemId, issuer).then((theItem) => {
                  nftItem = theItem;

                  //print its state
                  return nftItem.getState().then((itemState) => {
                     console.log("Item state:", JSON.stringify(itemState));
                     console.log("Transferring NFT item to:" + student.address);

                     //transfer item to wallet, with some memo
                     let overrides = { memo: itemId + " transferred to " + student.address };
                     return nftItem.transfer(student.address, overrides).then((receipt) => {
                           console.log("Transfer NFT item receipt:", JSON.stringify(receipt));
                     });

                  });
               }).catch(error => {
                  console.log(error);
               });
         }).catch(error => {
               console.log(error);
         });
      });
   }


.. note:: 
   | Online Learning tutorial is organized into methods for individual functions, so you can pass in different parameters to see how things work. To run the code, first compile using ``tsc``, then run with command:
   |  ``node dist/onlinelearning/online-learning.js <method_name>``

   | Third argument is the method to call, followed by the method's parameter(s), if any. For example, below command shows how we can trigger ``addCourse()`` method using parameter `Art`:
   |  ``node dist/onlinelearning/online-learning.js addCourse Art``

-----


Flight Ticketing System Tutorial
################################

Introduction:
   This tutorial covers various functionalities in a Flight Ticketing system. 

**1. Initial setup**
********************

To start with, we'll continue in same project and create new folder [`flightticket`] under [`/MaxonrowTutorial/src/`] project directory like the following:

|  /`MaxonrowTutorial`
|     /`src`
|        /`onlinelearning`
|        /`flightticket` <==
|     /`package.json`

Create a new file name `flight-ticket.ts` in folder [`/MaxonrowTutorial/src/flightticket`].

**2. Create NFT**
*****************

.. code-block:: javascript

   //set nft properties
   let ntfProperties = {
      name: "my2sgFlightTicket05",
      symbol: "my2sg06",
      fee: {
         to: "mxw1qgwzdxf66tp5mjpkpfe593nvsst7qzfxzqq73d",
         value: bigNumberify("1")
      },
      properties: "fMYtSG@5",
      metadata: "here"
   };

   //create nft token using properties above
   token.NonFungibleToken.create(ntfProperties,issuer).then((token)=>{
      console.log(JSON.stringify(token))
   });


**3. Query NFT**
****************

.. code-block:: javascript

   //Query token, to update/ refresh all data of the token
   mxw.nonFungibleToken.NonFungibleToken.fromSymbol("my2sg05",issuer).then((token)=>{
      console.log(JSON.stringify(token))
   });


**3. Authorise NFT**
********************

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


**5. Endorse item**
*******************

.. code-block:: javascript

   //endorse item
   var ntfInstance = new NonFungibleTokenItem("my2sg05","001", issuer);
   ntfInstance.endorse().then((receipt) => {
         console.log(receipt);
   });


**6. Transfer NFT item**
************************

.. code-block:: javascript

   //transfer item
   var nonFungibleTokenItem = new NonFungibleTokenItem("my2sg05","001", issuer);
    nonFungibleTokenItem.transfer(middleware.address).then((receipt) => {
        console.log(receipt);
    })


**7. Overwrite the item metadata**
**********************************

.. code-block:: javascript

   //overwrite the item metadata with string "overwrite"
   ntfInstance.updateMetadata("overwrite")

   var nftItemStatus;
   ntfInstance.getState().then((result)=>{
      nftItemStatus = result.metadata;
   });

**8. Add new info into the item metadata**
******************************************

.. code-block:: javascript

   //adding new info into the item metadata
   ntfInstance.updateMetadata(nftItemStatus+ "think not").then((receipt)=>{
      console.log(receipt.status);
   });
   ntfInstance.getState().then((result)=>{
      nftItemStatus = result.metadata;
   });

**9. Transfer MXW**
*******************
.. code-block:: javascript

   //transfer mxw
   let amount = mxw.utils.parseMxw("1.0");
   wallet.getBalance().then((result)=>{
      console.log(result)
   });
   wallet.transfer(issuer.address,amount).then((receipt)=>{
      console.log(receipt);
   });
   wallet.getBalance().then((result)=>{
      console.log(result)
   });


**10. Freeze item**
*******************

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


**11. Unfreeze item**
*********************

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


**12. Burn item**
*****************

.. code-block:: javascript

   //burn item
   var ntfInstance = new NonFungibleTokenItem("my2sg05","005", issuer);
   ntfInstance.burn().then((receipt) => {
      console.log(JSON.stringify(receipt));
   });


.. note:: 
   | Flight Ticketing System tutorial is organized like a module. To run the code, first compile using ``tsc``, then run with command:
   |  ``node dist/flightticket/flight-ticket.js``

-----

For complete source code, please refer in GitHub.

.. _VS Code: https://code.visualstudio.com/
.. _Node: https://nodejs.org/en/download/
.. _npm: https://nodejs.org/en/download/