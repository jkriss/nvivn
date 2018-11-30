const debug = require('debug')('nvivn:sync:localstorage')

class LocalStorageSyncStore {
  constructor({ prefix }) {
    this.prefix = `nvivn.sync${prefix || ''}:`
  }
  key(k) {
    return `${this.prefix}${k}`
  }
  put(k, v) {
    debug('saving', k, '=', v)
    localStorage.setItem(this.key(k), JSON.stringify(v))
  }
  get(k) {
    return JSON.parse(localStorage.getItem(this.key(k)))
  }
}

module.exports = LocalStorageSyncStore
