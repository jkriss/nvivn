const debug = require('debug')('nvivn:create')
const split2 = require('split2')
const formatMessage = require('../format-message')
const parseMessage = require('../parse-message')

const create = opts => {
  opts.inputStream
    .pipe(split2())
    .on('data', line => {
      debug('read:', line)
      const message = parseMessage(line, opts)
      opts.outputStream.write(formatMessage(message, opts.format) + '\n')
    })
    .on('finish', () => debug('done'))
}

module.exports = create
