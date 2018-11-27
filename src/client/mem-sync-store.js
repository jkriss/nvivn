class MemSyncStore {
  constructor() {
    this.db = {}
  }
  put(k, v) {
    this.db[k] = v
  }
  get(k) {
    return this.db[k]
  }
}

module.exports = MemSyncStore
