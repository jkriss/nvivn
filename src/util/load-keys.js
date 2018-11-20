require('dotenv').config()
const multibase = require('multibase')

const loadKeys = () => {
  if (process.env.NVIVN_PUBLIC_KEY) {
    return {
      publicKey: multibase.decode(process.env.NVIVN_PUBLIC_KEY),
      secretKey: multibase.decode(process.env.NVIVN_SECRET_KEY),
    }
  }
}

module.exports = loadKeys
