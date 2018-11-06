const debug = require('debug')('nvivn:post')
const split2 = require('split2')
const hashing = require('../hashing')
const multibase = require('multibase')
const { sign } = require('../simple/signing')
const stringify = require('json-stable-stringify')
const parseMessage = require('../simple/parse-message')
const signMessage = require('../simple/sign-message')
const formatMessage = require('../simple/format-message')

const constructPost = (message, opts={}) => {
  const m = parseMessage(message, opts)

  if (!m.meta) m.meta = {}
  m.meta.t = Date.now()

  if (opts.identity) {

    signMessage(m, opts)

    if (!m.meta.route) m.meta.route = []
    m.meta.route.push({
      publicKey: opts.identity.publicKey,
      t: Date.now()
    })
  }

  // const hashData = [message, meta.route[0].id, m.meta.t]
  const hashData = [message, m.meta.t+""]
  if (m.from) hashData.push(m.from)
  m.meta.hash = hashing.hashEnc(hashData)

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
