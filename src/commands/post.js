const debug = require('debug')('nvivn:post')
const sign = require('./sign')
const hash = require('../util/hash')

const post = async (message, opts) => {
  let m = Object.assign({}, message)
  // debug('message store:', opts.messageStore)
  if (opts.messageStore) {
    // if it's a deletion, delete the old one first
    if (m.meta.signed && m.meta.signed.find(s => s.type === 'deletion')) {
      // TODO add any other kind of validation here? who's allowed?
      await opts.messageStore.del(m.meta.hash)
    }
    const exists = await opts.messageStore.exists(
      (m.meta && m.meta.hash) || hash(m)
    )
    if (!exists) {
      m = sign(m, { keys: opts.keys, signProps: { type: 'route' } })
      debug('signed message:', m)
      await opts.messageStore.write(m)
    }
  }
  return m
}

module.exports = post
