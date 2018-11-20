const debug = require('debug')('nvivn:post')
const sign = require('./sign')

const post = async (message, opts) => {
  let m = Object.assign({}, message)
  debug('message store:', opts.messageStore)
  m = sign(m, { keys: opts.keys, signProps: { type: 'route' } })
  if (opts.messageStore) {
    await opts.messageStore.write(m)
  }
  return m
}

module.exports = post
