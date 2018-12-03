const debug = require('debug')('nvivn:config:db')
const assert = require('assert')
const Datastore = require('nedb')
const EventEmitter = require('events')

const getConfigDb = async (opts = {}) => {
  const db = new Datastore(Object.assign(opts.dbOpts || {}, { autoload: true }))
  const emitter = new EventEmitter()
  await new Promise((resolve, reject) => {
    db.loadDatabase(err => (err ? reject(err) : resolve()))
    debug('persisted config db loaded')
  })
  let _data = {}
  const persistedData = await _json()
  debug('persisted data loaded', persistedData)
  if (opts.data) {
    await set(opts.data, { silent: true })
    debug('initialized data loaded', opts.data)
  }
  _data = Object.assign({}, _data, persistedData)
  debug('initialized data plus persisted data:', JSON.stringify(_data.info))
  function set(data, opts = {}) {
    debug('-- setting data --')
    assert(
      typeof data === 'object',
      `Can only set an object value, not ${typeof data}`
    )
    const promises = []
    _data = Object.assign({}, _data, data)
    // debug('merged data now', JSON.stringify(_data))
    if (!opts.silent) emitNew()
    for (const k of Object.keys(data)) {
      promises.push(
        new Promise((resolve, reject) => {
          db.update(
            { _id: k },
            { _id: k, value: data[k] },
            { upsert: true },
            err => {
              if (err) return reject(err)
              resolve()
            }
          )
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
          // debug('returning entry', doc)
          obj[doc._id] = doc.value
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
