const debug = require('debug')('nvivn:filter')
const mingo = require('mingo')
const datemath = require('./datemath-parser-lite')
const flatten = require('flat')

const filter = (query, opts = {}) => {
  let f
  const q = Object.assign({}, query)
  debug('q:', q)
  debug('opts:', opts)
  if (q.createdAfter || q.createdBefore) {
    q.t = {}
    if (q.createdAfter) {
      q.t.$gt = datemath.parse(q.createdAfter.toString())
      delete q.createdAfter
    }
    if (q.createdBefore) {
      q.t.$lt = datemath.parse(q.createdBefore.toString())
      delete q.createdBefore
    }
  }
  if (q.since && opts.publicKey) {
    debug(`looking for messages routed by ${opts.publicKey} since ${q.since}`)
    q['meta.signed'] = {
      $elemMatch: {
        publicKey: opts.publicKey,
        t: { $gt: datemath.parse(q.since.toString()) },
      },
    }
    delete q.since
  }
  const textQuery = q.$text
  if (textQuery) {
    delete q.$text
  }
  const anyQueryElements = Object.keys(q).length > 0
  if (anyQueryElements || textQuery) {
    let filter
    if (anyQueryElements) {
      debug('building filter for', JSON.stringify(q, null, 2))
      filter = new mingo.Query(q)
    }
    // f.test = f.test.bind(f)
    f = m => {
      const filterMatch = !filter || filter.test(m)
      let textMatch = true
      if (filterMatch && textQuery) {
        const str = Object.values(flatten(m)).join(' ')
        textMatch = str.includes(textQuery)
        if (textMatch)
          debug('found', textQuery, 'in', str, '; result:', textMatch)
      }
      return filterMatch && textMatch
    }
  }
  return f ? f : () => true
}

module.exports = filter
