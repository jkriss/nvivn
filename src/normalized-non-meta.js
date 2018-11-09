const stringify = require('fast-json-stable-stringify')

const normalizedNonMeta = message => {
  const messageClone = Object.assign({}, message)
  delete messageClone.meta
  return stringify(messageClone)
}

module.exports = {
  normalizedNonMeta
}
