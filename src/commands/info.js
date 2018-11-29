const sign = require('./sign')
const create = require('./create')
const { encode } = require('../util/encoding')

const info = async (_, opts = {}) => {
  const data = Object.assign(
    { publicKey: encode(opts.keys.publicKey) },
    opts.info
  )
  const m = create(data)
  return sign(m, opts)
}

module.exports = info
