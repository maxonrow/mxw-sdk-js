const { createHash } = require('crypto')
const BN = require('bn.js')

const EC = require('elliptic').ec
const secp256k1 = new EC('secp256k1')

const hash = (hash, data) =>
    createHash(hash)
        .update(data)
        .digest()

const convertSignature = sig => {
    const r = new BN(sig.r)

    if (r.cmp(secp256k1.curve.n) >= 0) r = new BN(0)

    const s = new BN(sig.s)
    if (s.cmp(secp256k1.curve.n) >= 0) s = new BN(0)

    return Buffer.concat([
        r.toArrayLike(Buffer, 'be', 32),
        s.toArrayLike(Buffer, 'be', 32),
    ])
}

module.exports = {
    hash,
    convertSignature,
}
