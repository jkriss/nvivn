const debug = require('debug')('nvivn:filter')
const mingo = require('mingo')
const datemath = require('datemath-parser')

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
  if (Object.keys(q).length > 0) {
    debug('building filter for', JSON.stringify(q, null, 2))
    f = new mingo.Query(q)
    f.test = f.test.bind(f)
  }
  return f ? f.test : () => true
}

module.exports = filter
