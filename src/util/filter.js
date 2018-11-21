const debug = require('debug')('nvivn:filter')
const mingo = require('mingo')
const datemath = require('datemath-parser')
const flatten = require('flat')

const filter = (query, opts = {}) => {
  let f
  const q = Object.assign({}, query)
  debug('q:', q)
  // if (q.since) {
  //   q.t = { $gt: datemath.parse(q.since) }
  //   delete q.since
  // }
  if (q.created) {
    q.t = { $gt: datemath.parse(q.created) }
    delete q.created
  }
  if (q.since && opts.publicKey) {
    debug(`looking for messages routed by ${opts.publicKey} since ${q.since}`)
    q['meta.signed'] = {
      $elemMatch: {
        publicKey: opts.publicKey,
        t: { $gt: datemath.parse(q.since) },
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
