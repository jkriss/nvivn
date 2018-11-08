const debug = require('debug')('nvivn:post')
const split2 = require('split2')
const hash = require('../simple/hash')
const multibase = require('multibase')
const { sign } = require('../simple/signing')
const stringify = require('fast-json-stable-stringify')
const parseMessage = require('../simple/parse-message')
const signMessage = require('../simple/sign-message')
const formatMessage = require('../simple/format-message')
const normalizedNonMeta = require('../simple/normalized-non-meta')

const constructPost = (message, opts={}) => {
  const m = parseMessage(message, opts)

  if (!m.meta) m.meta = {}
  // m.meta.t = Date.now()

  if (opts.identity) {

    signMessage(m, opts)

    if (!m.meta.route) m.meta.route = []
    m.meta.route.push({
      publicKey: opts.identity.publicKey,
      t: Date.now()
    })
  }

  m.meta.hash = hash(m)

  return m
}

const post = (opts) => {
  // debug("posting", opts)
  opts.inputStream.pipe(split2())
    .on('data', line => {
      debug("read:", line)
      const message = constructPost(line, opts)
      // debug("message:", message)
      opts.outputStream.write(formatMessage(message, opts.format)+'\n')
    })
    .on('finish', () => debug("done"))
}

module.exports = post
