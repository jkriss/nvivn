const debug = require('debug')('nvivn:delete')
const sign = require('./sign')

const del = async (hash, opts = {}) => {
  debug('message store:', opts.messageStore)
  if (opts.messageStore) {
    // get the message
    const m = await opts.messageStore.get(hash)
    debug('deleting message', m)
    if (m) {
      let deletedMessage = Object.assign({}, m)
      deletedMessage.body = null
      // delete the old thing
      await opts.messageStore.del(hash)
      deletedMessage = sign(deletedMessage, {
        keys: opts.keys,
        signProps: { type: 'deletion' },
      })
      // write this new deletion record
      await opts.messageStore.write(deletedMessage)
      return deletedMessage
    }
  }
}

module.exports = del
