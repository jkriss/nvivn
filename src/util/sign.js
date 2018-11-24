const debug = require('debug')('nvivn:util:sign')
const without = require('../util/without')
const normalizedNonMeta = require('../util/normalized-non-meta')
const signatures = require('sodium-signatures')
const { encode } = require('../util/encoding')

const signPayload = (message, secretKeyBuffer) => {
  debug('signing', normalizedNonMeta(message))
  const signature = signatures.sign(
    Buffer.from(normalizedNonMeta(message)),
    secretKeyBuffer
  )
  return encode(signature)
}

const sign = (message, opts = {}) => {
  debug('signing', message)
  const t = Date.now()
  const signProps = opts.signProps || {}
  const objToSign = {
    hash: message.meta.hash,
    t,
    ...signProps,
  }
  const signature = signPayload(objToSign, opts.keys.secretKey)
  return {
    publicKey: encode(opts.keys.publicKey),
    signature,
    ...without(objToSign, 'hash'),
  }
}

module.exports = sign
