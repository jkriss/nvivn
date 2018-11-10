const debug = require('debug')('nvivn:list')
const ndjson = require('ndjson')
const mingo = require('mingo')
const through2 = require('through2')
const datemath = require('datemath-parser')

const list = opts => {
  debug('listing with opts')
  let filter
  // build a mingo filter from this
  const q = {}
  if (!opts.filter) opts.filter = []
  opts.filter.forEach(f => {
    const [field, value] = f.split(':')
    if (field === 'since') {
      q.t = { $gt: datemath.parse(value) }
    } else {
      q[field] = value
    }
  })
  if (opts.new && opts.identity) {
    // stuff never signed by this identity
    q['meta.signed'] = {
      $not: {
        $elemMatch: {
          publicKey: opts.identity.publicKey,
        },
      },
    }
  }
  // console.log("query:", q)
  if (Object.keys(q).length > 0) filter = new mingo.Query(q)

  const filterStream = through2.obj(function(chunk, enc, callback) {
    if (!filter || filter.test(chunk)) {
      debug('matched:', chunk)
      this.push(chunk)
    }
    callback()
  })
  debug('file store?', !!opts.fileStore)
  if (opts.fileStore) {
    opts.fileStore
      .getReadStream()
      .pipe(filterStream)
      .pipe(ndjson.stringify())
      .pipe(opts.outputStream)
  }
}

module.exports = list
