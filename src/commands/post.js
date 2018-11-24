const debug = require('debug')('nvivn:post')
const sign = require('./sign')

const post = async (message, opts) => {
  let m = Object.assign({}, message)
  // debug('message store:', opts.messageStore)
  m = sign(m, { keys: opts.keys, signProps: { type: 'route' } })
  debug('signed message:', m)
  if (opts.messageStore) {
    // if it's a deletion, delete the old one first
    if (m.meta.signed && m.meta.signed.find(s => s.type === 'deletion')) {
      // TODO add any other kind of validation here? who's allowed?
      await opts.messageStore.del(m.meta.hash)
    }
    await opts.messageStore.write(m)
  }
  return m
}

module.exports = post
