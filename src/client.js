const { stringify } = require('deterministic-json')
const axios = require('axios')

const getRawState = node => {
    return async (params = '', decode = true) => {
        let { path, data } = params

        return axios
            .get(
                `${
                    node
                }/abci_query?path="${path}"&data=${data ? `0x${data}` : ''}`
            )
            .then(res => {
                if (decode) {
                    return Buffer.from(
                        res.data.result.response.value || '',
                        'base64'
                    ).toString()
                } else {
                    return Buffer.from(
                        res.data.result.response.value || '',
                        'base64'
                    )
                }
            })
    }
}

const sendTx = node => {
    return async (tx) => {
        let txBytes = '0x' + tx

        return axios
            .get(
                `${
                    node
                }/broadcast_tx_commit`,
                {
                    params: {
                        tx: txBytes,
                    },
                }
            )
            .then(res => res.data.result)
    }
}

const connect = opts => {
    return new Promise(async (resolve, reject) => {
        const nodes = opts.nodes

        const node = nodes[Math.floor(Math.random() * nodes.length)].replace('ws', 'http')

        let send = sendTx(node)
        let rawState = getRawState(node)

        resolve({
            send: send,
            rawState: rawState,
        })
    })
}

module.exports = connect
