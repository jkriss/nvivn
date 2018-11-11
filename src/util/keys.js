const signatures = require('sodium-signatures')
const multibase = require('multibase')

const generate = () => {
  const keys = signatures.keyPair()
  return {
    publicKey: multibase.encode('base64', keys.publicKey).toString(),
    secretKey: multibase.encode('base64', keys.secretKey).toString(),
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
