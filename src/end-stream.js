const debug = require('debug')('nvivn:end-stream')

module.exports = stream => {
  stream.on('error', err => {
    if (err.code !== 'ERR_STDOUT_CLOSE') throw err
  })
  debug('-- ending --')
  stream.end()
  debug('-- ended --')
}
