const debug = require('debug')('nvivn:verify')
const split2 = require('split2')
const verifySignature = require('../simple/signing').verify

const verifyPost = (line, opts) => {
  let message
  if (opts.format === 'json') {
    message = JSON.parse(line)
  } else {
    throw new Error(`Unknown format ${opts.format}`)
  }
  return verifySignature(message)
}

const verify = opts => {
  return new Promise((resolve, reject) => {
    const results = []
    opts.inputStream.pipe(split2())
      .on('data', line => {
        debug("read:", line)
        const result = verifyPost(line, opts)
        debug("result:", result)
        const anyMatch = !!result.find(r => r)
        results.push(result)
        if (anyMatch) opts.outputStream.write(line+'\n')
      })
      .on('finish', () => {
        debug("done")
        resolve(results)
      })
  })
}

module.exports = verify
