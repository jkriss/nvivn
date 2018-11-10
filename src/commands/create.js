const debug = require('debug')('nvivn:create')
const split2 = require('split2')
const formatMessage = require('../format-message')
const parseMessage = require('../parse-message')
const { signMessage } = require('../sign-message')
const endStream = require('../end-stream')

const createMessage = (message, opts) => {
  if (opts.identity) {
    signMessage(message, opts)
  }
  return formatMessage(message, opts.format)
}

const create = opts => {
  opts.inputStream
    .pipe(split2())
    .on('data', line => {
      debug('read:', line)
      const message = parseMessage(line, opts)
      if (opts.identity) {
        message.from = opts.identity.publicKey
      }
      opts.outputStream.write(createMessage(message, opts) + '\n')
    })
    .on('finish', () => {
      endStream(opts.outputStream)
      debug('done')
    })
}

module.exports = create
