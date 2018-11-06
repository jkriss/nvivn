const debug = require('debug')('nvivn:sign-message')
const multibase = require('multibase')
const { sign } = require('../simple/signing')

const signMessage = (message, opts) => {
  if (opts.identity) {
    const secretKeyBuffer = multibase.decode(opts.identity.secretKey)
    const signature = sign(message, secretKeyBuffer)
    if (!message.meta) message.meta = {}
    if (!message.meta.signed) {
      message.meta.signed = []
      message.meta.signed.push({
        publicKey: opts.identity.publicKey,
        signature
      })
      debug("signature:", signature)
    }

  }

}

module.exports = signMessage