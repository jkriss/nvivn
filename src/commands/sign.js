const createSignature = require('../util/sign')
const { decode, encode } = require('../util/encoding')

const sign = (message, opts = {}) => {
  if (!opts.keys) return message
  const m = Object.assign({}, message)
  const keys = Object.assign({}, opts.keys)
  if (typeof keys.publicKey === 'string') {
    keys.publicKey = decode(keys.publicKey)
    keys.secretKey = decode(keys.secretKey)
  }
  const signatureObj = createSignature(m, {
    keys,
    signProps: opts.signProps,
  })
  if (!m.meta.signed) m.meta.signed = []
  m.meta.signed.push(signatureObj)
  return m
}

module.exports = sign
