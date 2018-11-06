const debug = require('debug')('nvivn:signing')
const signatures = require('sodium-signatures')
const multibase = require('multibase')
const stringify = require('json-stable-stringify')

const signedContent = message => {
  const messageClone = Object.assign({}, message)
  delete messageClone.meta
  return stringify(messageClone)
}

const sign = (message, secretKeyBuffer) => {
  const signature = signatures.sign(Buffer.from(signedContent(message)), secretKeyBuffer)
  return multibase.encode('base58flickr', signature).toString()
}

const verify = message => {
  if (!(message.meta && message.meta.signed)) return [false]
  const messageString = signedContent(message)
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
