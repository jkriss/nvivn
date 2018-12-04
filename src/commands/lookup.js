const debug = require('debug')('nvivn:lookup')
const verify = require('./verify')
const list = require('./list')

const lookup = async ({ publicKey, id, domain, since }, opts = {}) => {
  if (!since) since = 'now-1d'
  const findOpts = {
    type: 'announce',
    since,
    $limit: 1,
  }
  if (id) findOpts.id = id
  else if (domain) findOpts.domain = domain
  else if (publicKey) findOpts.publicKey = publicKey
  const results = []
  for await (const announce of list(findOpts, opts)) {
    debug('found announcement:', announce)
    if (
      announce &&
      verify(announce, { all: true }) &&
      announce.publicKey === announce.meta.signed[0].publicKey
    ) {
      results.push(announce)
    }
  }
  return results
}

module.exports = lookup
