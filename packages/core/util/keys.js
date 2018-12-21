const signatures = require('sodium-signatures')
const { encode } = require('./encoding')

const generate = () => {
  const keys = signatures.keyPair()
  return {
    publicKey: encode(keys.publicKey),
    secretKey: encode(keys.secretKey),
  }
}

const env = keys => {
  return `NVIVN_PUBLIC_KEY=${keys.publicKey}
NVIVN_SECRET_KEY=${keys.secretKey}`
}

module.exports = {
  generate,
  env,
}
