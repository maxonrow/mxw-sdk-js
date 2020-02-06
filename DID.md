# Maxonrow DID

Maxonrow DID is Maxonrow Decentralized Identifiers. It make use of the non fungible token (NFT). The symbol for the non fungible token is DID, which is not transferable, but mintable (mint limit is 1), it is public (user can mint for themselve only), it is not burnable. 

## Installation

```bash
npm install --save mxw-sdk-js
```

## Usage

```javascript
import { mxw, nonFungibleToken as token, errors } from '../src.ts/index';

let issuerNonFungibleToken: token.NonFungibleToken;

//* Create Maxonrow DID
let item = {
    symbol: "DID", // did nft symbol
    itemID: "did:example:123456#oidc", // can be any string
    properties: ["prop1"], // can be any string array (can't update in future)
    metadata: ["str1", "str2"] // can be any string array (can be updated)
} as token.NonFungibleTokenItem;

return token.NonFungibleToken.mint(didOwner, item, didOwner).then((receipt) => {
    console.log(receipt);
});


//* Query Maxonrow DID
issuerNonFungibleToken.getItemState(itemId).then((result) => {
    console.log(result);
})

//* Update the Metadata
token.NonFungibleToken.updateItemMetadata(symbol, itemId, ["testing"], provider).then((receipt) => {
    console.log(result);
});
```

## Details
For more details, you could refer to the sdk Test case 0800. 

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
