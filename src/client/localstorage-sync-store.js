class LocalStorageSyncStore {
  constructor({ prefix }) {
    this.prefix = `nvivn.sync${prefix || ''}:`
  }
  key(k) {
    return `${this.prefix}${k}`
  }
  put(k, v) {
    console.log('saving', k, '=', v)
    localStorage.setItem(this.key(k), JSON.stringify(v))
  }
  get(k) {
    return JSON.parse(localStorage.getItem(this.key(k)))
  }
}

module.exports = LocalStorageSyncStore
