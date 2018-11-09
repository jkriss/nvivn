const debug = require('debug')('nvivn:signing')
const signatures = require('sodium-signatures')
const multibase = require('multibase')
const stringify = require('fast-json-stable-stringify')
const hash = require('./hash')
const { normalizedNonMeta } = require('./normalized-non-meta')

const sign = (message, secretKeyBuffer) => {
  debug('signing', normalizedNonMeta(message))
  const signature = signatures.sign(
    Buffer.from(normalizedNonMeta(message)),
    secretKeyBuffer
  )
  return multibase.encode('base58flickr', signature).toString()
}

const normalizedSignatures = message => {
  if (!message.meta || !message.meta.signed) return []
  // recompute this to make sure the message hasn't been tampered with
  const h = hash(message)
  debug('hash of message', message, 'is', h)
  return message.meta.signed.map(sig => {
    const sigClone = Object.assign({ hash: h }, sig)
    delete sigClone.publicKey
    delete sigClone.signature
    return {
      payload: stringify(sigClone),
      publicKey: sig.publicKey,
      signature: sig.signature,
    }
  })
}

const verify = message => {
  if (!(message.meta && message.meta.signed)) return [false]
  const results = []
  for (const { payload, signature, publicKey } of normalizedSignatures(
    message
  )) {
    debug('checking', publicKey, signature)
    debug('payload:', payload)
    const pubKeyBuffer = multibase.decode(publicKey)
    const signatureBuffer = multibase.decode(signature)
    const payloadBuffer = Buffer.from(payload)
    const verificationResult = signatures.verify(
      payloadBuffer,
      signatureBuffer,
      pubKeyBuffer
    )
    debug('valid?', verificationResult)
    results.push(verificationResult)
  }
  return results
}

module.exports = {
  sign,
  verify,
}
