const debug = require('debug')('nvivn:signing')
const signatures = require('sodium-signatures')
const multibase = require('multibase')
const normalizedNonMeta = require('./normalized-non-meta')

const sign = (message, secretKeyBuffer) => {
  const signature = signatures.sign(Buffer.from(normalizedNonMeta(message)), secretKeyBuffer)
  return multibase.encode('base58flickr', signature).toString()
}

const verify = message => {
  if (!(message.meta && message.meta.signed)) return [false]
  const messageString = normalizedNonMeta(message)
  debug("checking message body:", messageString, typeof messageString)
  const bodyBuffer = Buffer.from(messageString)
  const results = []
  for (const sig of message.meta.signed) {
    const { publicKey, signature } = sig
    debug("checking", publicKey, signature)
    const pubKeyBuffer = multibase.decode(publicKey)
    const signatureBuffer = multibase.decode(signature)
    const verificationResult = signatures.verify(bodyBuffer, signatureBuffer, pubKeyBuffer)
    results.push(verificationResult)
  }
  return results
}

module.exports = {
  sign,
  verify
}
