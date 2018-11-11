const debug = require('debug')('nvivn:util:sign')
const without = require('../util/without')
const normalizedNonMeta = require('../util/normalized-non-meta')
const signatures = require('sodium-signatures')
const multibase = require('multibase')

const signPayload = (message, secretKeyBuffer) => {
  debug('signing', normalizedNonMeta(message))
  const signature = signatures.sign(
    Buffer.from(normalizedNonMeta(message)),
    secretKeyBuffer
  )
  return multibase.encode('base58flickr', signature).toString()
}

const sign = (message, opts = {}) => {
  const t = Date.now()
  const signProps = opts.signProps || {}
  const objToSign = {
    hash: message.meta.hash,
    t,
    ...signProps,
  }
  const signature = signPayload(objToSign, opts.keys.secretKey)
  return {
    publicKey: multibase.encode('base58flickr', opts.keys.publicKey).toString(),
    signature,
    ...without(objToSign, 'hash'),
  }
}

module.exports = sign
