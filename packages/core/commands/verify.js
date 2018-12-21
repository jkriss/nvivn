const debug = require('debug')('nvivn:verify')
const stringify = require('fast-json-stable-stringify')
const { decode } = require('../util/encoding')
const signatures = require('sodium-signatures')
const without = require('../util/without')
const hash = require('../util/hash')

const normalizedSignatures = message => {
  if (!message.meta || !message.meta.signed) return []
  // recompute this to make sure the message hasn't been tampered with
  let h
  if (
    message.meta.signed &&
    message.meta.signed.find(s => s.type === 'deletion')
  ) {
    // trust the old message hash, we're just verifying the signatures
    debug(`it's a deletion, use the message hash`)
    h = message.meta.hash
  } else {
    h = hash(message)
    debug(`calculated hash ${h} (supplied hash was ${message.meta.hash})`)
  }
  debug('hash of message', message, 'is', h)
  return message.meta.signed.map(sig => {
    const sigClone = without(
      Object.assign({ hash: h }, sig),
      'publicKey',
      'signature'
    )
    return {
      payload: stringify(sigClone),
      publicKey: sig.publicKey,
      signature: sig.signature,
    }
  })
}

const verify = (message, opts = {}) => {
  if (!(message.meta && message.meta.signed)) return opts.all ? false : [false]
  const results = []
  for (const { payload, signature, publicKey } of normalizedSignatures(
    message
  )) {
    debug('checking', publicKey, signature)
    debug('payload:', payload)
    const pubKeyBuffer = decode(publicKey)
    const signatureBuffer = decode(signature)
    const payloadBuffer = Buffer.from(payload)
    try {
      const verificationResult = signatures.verify(
        payloadBuffer,
        signatureBuffer,
        pubKeyBuffer
      )
      debug('valid?', verificationResult)
      results.push(verificationResult)
    } catch (err) {
      debug('Error validating', err)
      results.push(false)
    }
  }
  if (opts.all) return results.filter(r => r === true).length === results.length
  return results
}

module.exports = verify
