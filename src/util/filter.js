const mingo = require('mingo')
const datemath = require('datemath-parser')

const filter = query => {
  let f
  const q = Object.assign({}, query)
  if (q.since) {
    q.t = { $gt: datemath.parse(q.since) }
    delete q.since
  }
  // if (opts.new && opts.identity) {
  //   // stuff never signed by this identity
  //   q['meta.signed'] = {
  //     $not: {
  //       $elemMatch: {
  //         publicKey: opts.identity.publicKey,
  //       },
  //     },
  //   }
  // }
  if (Object.keys(q).length > 0) {
    f = new mingo.Query(q)
    f.test = f.test.bind(f)
  }
  return f ? f.test : () => true
}

module.exports = filter
