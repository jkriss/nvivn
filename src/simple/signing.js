const debug = require('debug')('nvivn:signing')
const signatures = require('sodium-signatures')
const multibase = require('multibase')
const stringify = require('json-stable-stringify')

const sign = (messageString, secretKeyBuffer) => {
  if (typeof messageString !== 'string') throw new Error(`Must pass a string to sign, got ${typeof messageString}`)
  debug("signing message body:", messageString, typeof messageString)
  const signature = signatures.sign(Buffer.from(messageString), secretKeyBuffer)
  return multibase.encode('base58flickr', signature).toString()
}

const verify = message => {
  if (!(message.meta && message.meta.signed)) return [false]
  const messageString = typeof message.body === 'string' ? message.body : stringify(message.body)
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
