const debug = require('debug')('nvivn:post')
const split2 = require('split2')
const multibase = require('multibase')
const stringify = require('fast-json-stable-stringify')
const hash = require('../hash')
const { sign } = require('../signing')
const parseMessage = require('../parse-message')
const { signMessage, signRoute } = require('../sign-message')
const formatMessage = require('../format-message')
const { normalizedNonMeta } = require('../normalized-non-meta')
const endStream = require('../end-stream')

const constructPost = async (message, opts = {}) => {
  const m = parseMessage(message, opts)

  if (!m.meta) m.meta = {}

  if (!m.meta.hash) m.meta.hash = hash(m)

  if (opts.fileStore) {
    const messageExists = await opts.fileStore.exists(m)
    debug(`does ${m.meta.hash} exist? ${messageExists}`)
    if (messageExists) return null
  }

  if (opts.identity) {
    signMessage(m, opts)
  }

  if (opts.fileStore) {
    opts.fileStore.write(m)
  }

  return m
}

const post = opts => {
  // debug("posting", opts)
  const allWrites = []
  opts.inputStream
    .pipe(split2())
    .on('data', line => {
      allWrites.push(
        new Promise(async resolve => {
          debug('read:', line)
          const message = await constructPost(line, opts)
          // debug("message:", message)
          if (message) {
            const formatted = formatMessage(message, opts.format)
            debug('writing to output stream', formatted)
            opts.outputStream.write(formatted + '\n')
          }
        })
      )
    })
    .on('finish', async () => {
      await Promise.all(allWrites)
      endStream(opts.outputStream)
      debug('done')
    })
}

module.exports = post
