const debug = require('debug')('nvivn:delete')
const sign = require('./sign')

const del = async ({ hash, hard }, opts = {}) => {
  if (opts.messageStore) {
    // get the message
    const mExists = await opts.messageStore.exists(hash)
    if (!mExists) {
      debug(`message doesn't exist`)
      return
    }
    const m = await opts.messageStore.get(hash)
    debug('deleting message', m)
    if (m) {
      // delete the old thing
      await opts.messageStore.del(hash)
      if (!hard) {
        let deletedMessage = Object.assign({}, m)
        deletedMessage.body = null
        deletedMessage.deleted = true
        deletedMessage = sign(deletedMessage, {
          keys: opts.keys,
          signProps: { type: 'deletion' },
        })
        // write this new deletion record
        await opts.messageStore.write(deletedMessage)
        return deletedMessage
      } else {
        return m
      }
    }
  } else {
    debug('no message store, skipping delete')
  }
}

module.exports = del
