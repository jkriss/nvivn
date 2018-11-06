const debug = require('debug')('nvivn:post')
const split2 = require('split2')
const hashing = require('../hashing')
const multibase = require('multibase')
const { sign } = require('../simple/signing')
const stringify = require('json-stable-stringify')

const constructPost = (message, opts={}) => {
  let m = {}
  let messageString
  if (opts.format === 'json') {
    let body
    try {
      const inputMessage = JSON.parse(message)
      if (inputMessage.body) m = inputMessage
      else m.body = inputMessage

      messageString = stringify(inputMessage)
    } catch (err) {
      m.body = message
      messageString = message
    }
  } else {
    throw new Error(`Unknown format ${opts.format}`)
  }

  if (!m.type) m.type = opts.type

  // add metadata
  m.meta = {
    t: Date.now()
  }

  if (opts.identity) {
    const secretKeyBuffer = multibase.decode(opts.identity.secretKey)
    const signature = sign(messageString, secretKeyBuffer)

    // TODO should this be a full public key?
    m.from = opts.identity.id

    if (!m.meta.signed) {
      m.meta.signed = []
      m.meta.signed.push({
        publicKey: opts.identity.publicKey,
        signature
      })
      debug("signature:", signature)
    }

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

const formatMessage = (message, format) => {
  if (format === 'json') {
    return JSON.stringify(message)
  } else {
    throw new Error(`Unknown format ${format}`)
  }
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
