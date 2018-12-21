const stringify = require('fast-json-stable-stringify')
const without = require('./without')

const normalizedNonMeta = message => {
  return stringify(without(message, 'meta'))
}

module.exports = normalizedNonMeta
