# Maxonrow DID

  

Maxonrow DID is Maxonrow Decentralized Identifiers. It make use of the non fungible token (NFT). The symbol for the non fungible token is DID, which is not transferable, but mintable (mint limit is 1), it is public (user can mint for themselve only), it is not burnable.

  

## Installation

  

```bash

npm install --save mxw-sdk-js

```

  

## Usage

  

```javascript


import { mxw, nonFungibleToken  as  token, errors } from  '../src.ts/index';
import { NonFungibleTokenItem } from  '../src.ts/non-fungible-token-item';
  

let  issuerNonFungibleToken: token.NonFungibleToken;

  
let issuer ;   // assume a kyced wallet

//* Operation 1 : Create new non fungible token
let nonFungibleTokenProperties = {
	name:  "Decentralised identifier ", // name
	symbol:  "DID", // symbol
	fee: {
		to:  feeCollector,  //feeCollector wallet address
		value:  bigNumberify("1")
	},
	metadata: ["Wallet able to manage their own metadata"],
	properties:["Decentralised identifier"]
};

return  token.NonFungibleToken.create(nonFungibleTokenProperties, issuer, defaultOverrides).then((token) => {
   if(token){

       //* Approve 
        let  overrides = {
            tokenFees: [
                { action:  NonFungibleTokenActions.transfer, feeName:  "default" },
                { action:  NonFungibleTokenActions.transferOwnership, feeName:  "default" },
                { action:  NonFungibleTokenActions.acceptOwnership, feeName:  "default" }
            ],
            endorserList: [],
            mintLimit:  1,
            transferLimit:  0,
            burnable:  false,
            transferable:  false,
            modifiable:  true,
            pub:  true  // not public
        };

        return  performNonFungibleTokenStatus(nonFungibleTokenProperties.symbol,token.NonFungibleToken.approveNonFungibleToken, overrides).then((receipt) => {
            console.log(receipt);  //do something
        });

   }
});



//* Operation 2 : Mint NFT Item to own-self
let  nftItemMinted : NonFungibleTokenItem;

let  item = {
	symbol:  "DID",
	itemID:  'did:example:123456#oidc',
	properties: ["prop1"],
	metadata: ["str1", "str2"]
} as  token.NonFungibleTokenItem;

let  minterNFT = new  NonFungibleToken("DID", issuer);

return  minterNFT.mint(issuer.address, item).then((receipt) => {
   console.log(receipt); //do something
});


//* Operation 3 : Perform NFT Item  related operations : update metadata, endorse, etc ...
return  NonFungibleTokenItem.fromSymbol("DID", "did:example:123456#oidc", issuer).then((nftItem) => {
	nftItemMinted = nftItem;
    console.log(nftItemMinted.parent.state); // check item's parent information
    //* Update the Metadata
    let  newMetadata = ["updated metadata"];

        return  nftItemMinted.updateMetadata(newMetadata).then((receipt) => {
	        console.log(receipt); //do something
        });
})



```

  

## Details

For more details, you could refer to the sdk Test case 0800.

  

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

  

Please make sure to update tests as appropriate.
