require('dotenv').config()
const { decode } = require('./encoding')

const loadKeys = () => {
  if (process.env.NVIVN_PUBLIC_KEY) {
    return {
      publicKey: decode(process.env.NVIVN_PUBLIC_KEY),
      secretKey: decode(process.env.NVIVN_SECRET_KEY),
    }
  }
}

module.exports = loadKeys
