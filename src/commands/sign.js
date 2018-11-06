const debug = require('debug')('nvivn:sign')
const split2 = require('split2')
const parseMessage = require('../simple/parse-message')
const signMessage = require('../simple/sign-message')
const formatMessage = require('../simple/format-message')

const parseAndSign = (message, opts) => {
  const m = parseMessage(message, opts)
  signMessage(m, opts)
  return m
}


const sign = (opts) => {
  // debug("posting", opts)
  opts.inputStream.pipe(split2())
    .on('data', line => {
      debug("read:", line)
      const message = parseAndSign(line, opts)
      opts.outputStream.write(formatMessage(message, opts.format)+'\n')
    })
    .on('finish', () => debug("done"))
}

module.exports = sign