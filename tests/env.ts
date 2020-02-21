'use strict';

interface Node {

    connection: {
        url: string,
        timeout: number
    },
    trace: {
        silent: boolean,
        silentRpc: boolean
    },
    chainId: string,
    name: string,
    airDrop: string,
    kyc: {
        provider: string,
        issuer: string,
        middleware: string
    },
    alias: {
        provider: string,
        issuer: string,
        middleware: string,
        feeCollector: string
    },

    fungibleToken: {
        provider: string,
        issuer: string,
        middleware: string,
        feeCollector: string,
    },

    nonFungibleToken: {
        provider: string,
        issuer: string,
        middleware: string,
        feeCollector: string,
        itemReceiver: string,

    },
};



const localnet: Node = {

    connection: {
        url: "http://192.168.20.21:26657",
        timeout: 60000
    },

    trace: {
        silent: true,
        silentRpc: true
    },

    chainId: "maxonrow-chain",
    name: "mxw",
    airDrop: "gold damp garlic turn host harbor else bird wrestle quarter surround parrot fan naive burst effort impact hen aware step gym ribbon inform cost",
    kyc: {
        provider: "into demand chief rubber raw hospital unit tennis sentence fade flight cluster",
        issuer: "pill maple dutch predict bulk goddess nice left paper heart loan fresh",
        middleware: "avocado trade bright wolf marble penalty mimic curve funny name certain visa"
    },
    alias: {
        provider: "mother paddle fire dolphin nuclear giggle fatal crop cupboard close abandon truck",
        issuer: "dynamic car culture shell kiwi harsh tilt boost vote reopen arrow moon",
        middleware: "hospital item sad baby mass turn ability exhibit obtain include trip please",
        feeCollector: "mxw123xwuat5h9x92w6vdtn4fl2l03t7d793qugxvc"
    },
    fungibleToken: {
        provider: "mother paddle fire dolphin nuclear giggle fatal crop cupboard close abandon truck",
        issuer: "dynamic car culture shell kiwi harsh tilt boost vote reopen arrow moon",
        middleware: "hospital item sad baby mass turn ability exhibit obtain include trip please",
        feeCollector: "mxw1prqdaqf74hdusk8st3ls30m748jl8a92muxf06"
    },
    nonFungibleToken: {
        provider: "language indoor mushroom gold motor genuine tower ripple baby journey where offer crumble chuckle velvet dizzy trigger owner mother screen panic question cliff dish",
        issuer: "appear scale write grow tiger puppy trick kite exhibit distance target cliff coin silly because train matrix weather list chat stamp warfare hobby ocean",
        middleware: "guard loop tell accuse village list prevent sea dolphin weapon own track spike venue gun blind carry hawk weapon track rain amazing author eagle",
        feeCollector: "mxw1md4u2zxz2ne5vsf9t4uun7q2k0nc3ly5g22dne",
        itemReceiver: "",
       
        //provider: "mother paddle fire dolphin nuclear giggle fatal crop cupboard close abandon truck",
        //issuer: "dynamic car culture shell kiwi harsh tilt boost vote reopen arrow moon",
        // middleware: "hospital item sad baby mass turn ability exhibit obtain include trip please",
        //feeCollector: "mxw1prqdaqf74hdusk8st3ls30m748jl8a92muxf06",
    }

};



const uatnet: Node = {
    connection: {
        url: "https://uatnet.usdp.io",
        timeout: 60000
    },

    trace: {
        silent: true,
        silentRpc: true
    },

    chainId: "uatnet",
    name: "mxw",
    airDrop: "roof voyage expire ball image despair soldier token destroy rocket couch drink",
    kyc: {
        provider: "into demand chief rubber raw hospital unit tennis sentence fade flight cluster",
        issuer: "pill maple dutch predict bulk goddess nice left paper heart loan fresh",
        middleware: "avocado trade bright wolf marble penalty mimic curve funny name certain visa"
    },
    alias: {
        provider: "check shrug marriage quote castle road animal open stock happy lunar wisdom",
        issuer: "close nice salt program material mouse outdoor guitar omit afford gravity fever",
        middleware: "try piece denial smooth lift hawk canoe phone ahead evolve deny breeze",
        feeCollector: "mxw1p3pg7uq0es63c5tg7g9hvtyvknwwf4t2dpvqrt"
    },

    fungibleToken: {
        provider: "mother paddle fire dolphin nuclear giggle fatal crop cupboard close abandon truck",
        issuer: "dynamic car culture shell kiwi harsh tilt boost vote reopen arrow moon",
        middleware: "hospital item sad baby mass turn ability exhibit obtain include trip please",
        feeCollector: "mxw1qgwzdxf66tp5mjpkpfe593nvsst7qzfxzqq73d"
    },

    nonFungibleToken: {
        provider: "mother paddle fire dolphin nuclear giggle fatal crop cupboard close abandon truck",
        issuer: "dynamic car culture shell kiwi harsh tilt boost vote reopen arrow moon",
        middleware: "hospital item sad baby mass turn ability exhibit obtain include trip please",
        feeCollector: "mxw1qgwzdxf66tp5mjpkpfe593nvsst7qzfxzqq73d",
        itemReceiver: "",

    }

};


const testnet: Node = {
    connection: {
        url: "https://testnet-node.mxw.one",
        timeout: 60000
    },
    trace: {
        silent: true,
        silentRpc: true
    },
    chainId: "testnet",
    name: "mxw",
    airDrop: "maid oval sand actress work push mention never thunder defense cigar train",
    kyc: {
        provider: "winter lyrics blanket notable matter warrior earth police once fitness drop ill",
        issuer: "poem dynamic inspire sport depart dirt awful venture goat mean chapter hint",
        middleware: "grocery father liar october ritual youth paper control voice episode motor either"
    },
    alias: {
        provider: "winter lyrics blanket notable matter warrior earth police once fitness drop ill",
        issuer: "poem dynamic inspire sport depart dirt awful venture goat mean chapter hint",
        middleware: "grocery father liar october ritual youth paper control voice episode motor either",
        feeCollector: "mxw1vt0nwy9f26twz89uccg7jfyhc55euyjvqvj34l"
    },
    fungibleToken: {
        provider: "winter lyrics blanket notable matter warrior earth police once fitness drop ill",
        issuer: "poem dynamic inspire sport depart dirt awful venture goat mean chapter hint",
        middleware: "grocery father liar october ritual youth paper control voice episode motor either",
        feeCollector: "mxw122h4ftps770r635p5hjsdxa27zm67rdqdczerz"
    },

    nonFungibleToken: {
        provider: "winter lyrics blanket notable matter warrior earth police once fitness drop ill",
        issuer: "poem dynamic inspire sport depart dirt awful venture goat mean chapter hint",
        middleware: "grocery father liar october ritual youth paper control voice episode motor either",
        feeCollector: "mxw122h4ftps770r635p5hjsdxa27zm67rdqdczerz",
        itemReceiver: "",

    }
};



const nodes: { [name: string]: Node } = { localnet, uatnet, testnet };
const nodeProvider: Node =  uatnet;
// const nodeProvider: Node = devnet;
 // const nodeProvider: Node = uatnet;
 //const nodeProvider: Node = testnet;

export {
    nodeProvider, nodes, localnet, uatnet, testnet,
    Node
};