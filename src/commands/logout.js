const debug = require('debug')('nvivn:logout')

const logout = opts => {
  return opts.keyStore.del(opts.username)
}

module.exports = logout
