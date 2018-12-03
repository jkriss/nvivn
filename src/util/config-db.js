const debug = require('debug')('nvivn:config:db')
const assert = require('assert')
const Datastore = require('nedb')
const EventEmitter = require('events')
const merge = require('merge')

const cache = []

const getConfigDb = async (opts = {}) => {
  const dbfile = opts.dbOpts && opts.dbOpts.filename
  if (dbfile && cache[dbfile]) {
    debug(`already have a db for ${dbfile}, returning`)
    return cache[dbfile]
  }
  const promise = _getConfigDb(opts)
  if (dbfile) cache[dbfile] = promise
  return promise
}
const _getConfigDb = async (opts = {}) => {
  const db = new Datastore(Object.assign(opts.dbOpts || {}, { autoload: true }))
  const emitter = new EventEmitter()
  await new Promise((resolve, reject) => {
    db.loadDatabase(err => (err ? reject(err) : resolve()))
    debug('persisted config db loaded')
  })
  let _data = {}
  const persistedData = await _json()
  debug('persisted data loaded', persistedData)
  _data = persistedData
  if (opts.data) {
    await set(opts.data, { silent: true })
    debug('initialized data loaded', opts.data)
  }
  // file data wins, but merge is recursive
  _data = merge.recursive(true, persistedData, _data)
  debug('initialized data plus persisted data:', JSON.stringify(_data))
  function set(data, opts = {}) {
    // debug('-- setting data --')
    assert(
      typeof data === 'object',
      `Can only set an object value, not ${typeof data}`
    )
    const promises = []
    _data = merge.recursive(true, _data, data)
    // debug('merged data now', JSON.stringify(_data))
    if (!opts.silent) emitNew()
    for (const k of Object.keys(data)) {
      promises.push(
        new Promise((resolve, reject) => {
          const newValue = data[k]
          if (typeof newValue === 'undefined') {
            // this is a deletion
            db.remove({ _id: k }, {}, err => {
              return err ? reject(err) : resolve()
            })
          } else {
            // if it's an object, merge it instead of just overwriting
            const toSave =
              typeof newValue === 'object'
                ? merge.recursive(true, _data[k], newValue)
                : newValue
            debug(`writing ${k}: ${JSON.stringify(toSave)}`)
            const encoded = Buffer.from(JSON.stringify(toSave)).toString('hex')
            db.update(
              { _id: k },
              { _id: k, value: encoded },
              { upsert: true },
              err => {
                if (err) return reject(err)
                resolve()
              }
            )
          }
        })
      )
    }
    return Promise.all(promises)
  }
  function _json() {
    const obj = {}
    return new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) return reject(err)
        for (const doc of docs) {
          debug('returning entry', doc)
          obj[doc._id] = JSON.parse(Buffer.from(doc.value, 'hex').toString())
        }
        // debug('returning obj:', obj)
        resolve(obj)
      })
    })
  }
  function data() {
    return _data
  }
  function emitNew() {
    debug('emitting new data:', JSON.stringify(_data))
    emitter.emit('change', _data)
  }
  return {
    set,
    data,
    on: emitter.on.bind(emitter),
  }
}

module.exports = { getConfigDb }
