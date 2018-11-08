const crypto = require('crypto')
const normalizedNonMeta = require('./normalized-non-meta')

const hash = message => {
  const str = normalizedNonMeta(message)
  const h = crypto.createHash('sha256')
  h.update(str)
  return h.digest('base64')
}

module.exports = hash

if (require.main === module) {
  console.log(hash({"body": "hi"}))
}
