const hash = require('../util/hash')
const datemath = require('../util/datemath-parser-lite')

const create = input => {
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
  return m
}

module.exports = create
