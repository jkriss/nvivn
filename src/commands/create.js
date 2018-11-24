const hash = require('../util/hash')
const datemath = require('datemath-parser')
const sign = require('./sign')

const create = (input, opts) => {
  let message
  if (typeof input === 'string') {
    message = { body: input }
  } else {
    message = input
  }
  let m = Object.assign(
    {
      t: Date.now(),
      type: 'message',
    },
    message
  )
  if (m.expr && typeof m.expr !== 'number') {
    m.expr = datemath.parse(m.expr)
  }
  if (!m.meta) m.meta = {}
  if (!m.meta.hash) m.meta.hash = hash(m)
  if (!opts.skipSignature && opts.keys) {
    m = sign(m, {
      keys: opts.keys,
      signProps: { type: opts.signatureType || 'author' },
    })
  }
  return m
}

module.exports = create
