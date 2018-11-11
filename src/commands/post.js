const sign = require('./sign')

const post = async (message, opts) => {
  let m = Object.assign({}, message)
  if (opts.messageStore) {
    await opts.messageStore.write(m)
  }
  m = sign(m, { keys: opts.keys, signProps: { type: 'route' } })
  return m
}

module.exports = post
