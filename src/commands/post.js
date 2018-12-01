const debug = require('debug')('nvivn:post')
const assert = require('assert')
const sign = require('./sign')
const verify = require('./verify')
const hash = require('../util/hash')

const post = async (message, opts) => {
  assert(opts.messageStore, 'messageStore is required')
  const isBulk = Array.isArray(message)
  const messages = isBulk ? message : [message]
  let results
  // handle deletions first
  debug('starting deletion scan')
  for (const m of messages) {
    if (m.meta.signed && m.meta.signed.find(s => s.type === 'deletion')) {
      // TODO add any other kind of validation here? who's allowed?
      await opts.messageStore.del(m.meta.hash)
    }
  }
  debug('finished deletion scan')
  debug('checking to see what exists')
  const exists = await Promise.all(
    messages.map(m => opts.messageStore.exists(m.meta.hash))
  )
  const newMessages = messages.filter((m, i) => !exists[i])
  debug('done with exist check')
  let toSign
  if (!opts.skipValidation) {
    debug(`checking to see what's valid of ${newMessages.length}`)
    const validateOpts = Object.assign({ all: true }, opts)
    const valid = newMessages.map(m => verify(m, validateOpts))
    // deleted messages won't be valid, need to verify the signature but not the hash
    const validMessages = newMessages.filter((m, i) => valid[i])
    debug(`${validMessages.length} valid`)
    toSign = validMessages
  } else {
    debug(`skipping validation!`)
    toSign = newMessages
  }
  // sign first
  debug('signing')
  const signedMessages = toSign.map(m =>
    sign(m, { keys: opts.keys, signProps: { type: 'route' } })
  )
  // for (const message of messages) {
  //   let m = Object.assign({}, message)
  //   // debug('message store:', opts.messageStore)
  //   // if it's a deletion, delete the old one first
  //   const exists = await opts.messageStore.exists(
  //     (m.meta && m.meta.hash) || hash(m)
  //   )
  //   if (!exists) {
  //     m = sign(m, { keys: opts.keys, signProps: { type: 'route' } })
  //     // debug('signed message:', m)
  //   }
  //   signedMessages.push(m)
  // }
  debug('done signing')
  // bulk write if it's available
  if (opts.messageStore.writeMany) {
    debug('writing using writeMany')
    results = await opts.messageStore.writeMany(signedMessages, opts)
    debug('done writing')
  } else {
    debug('no writeMany method, using write')
    results = []
    for (const m of signedMessages) {
      const result = await opts.messageStore.write(m)
      results.push(m)
    }
    debug('done writing')
  }
  return isBulk ? results : results[0]
}

module.exports = post
