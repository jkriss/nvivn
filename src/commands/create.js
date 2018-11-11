const hash = require('../util/hash')

const create = input => {
  let message
  if (typeof input === 'string') {
    message = { body: input }
  } else {
    message = input
  }
  const m = Object.assign(
    {
      t: Date.now(),
      type: 'message',
    },
    message
  )
  if (!m.meta) m.meta = {}
  if (!m.meta.hash) m.meta.hash = hash(m)
  return m
}

module.exports = create
