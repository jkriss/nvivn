const filter = require('../util/filter')

class MemoryStore {
  constructor() {
    this.messages = []
    this.hashes = {}
  }
  async exists(message) {
    return this.hashes[message.meta.hash]
  }
  async write(message) {
    const exists = await this.exists(message)
    if (!exists) {
      this.messages.push(message)
      this.hashes[message.meta.hash] = true
    }
  }
  async get(hash) {
    const m = this.messages.find(m => m.meta.hash === hash)
    if (m && m.expr !== undefined && m.expr <= Date.now()) {
      this.del(m.meta.hash)
      return null
    }
    return m
  }
  async del(hash) {
    const idx = this.messages.findIndex(m => m.meta.hash === hash)
    delete this.hashes[hash]
    if (idx >= 0) {
      this.messages.splice(idx, 1)
    }
  }
  async clear() {
    this.messages = []
    this.hashes = {}
  }
  *filteredGenerator(q) {
    const f = filter(q)
    for (const m of this) {
      if (f(m)) yield m
    }
  }
  filter(q) {
    const self = this
    return {
      [Symbol.iterator]() {
        return self.filteredGenerator(q)
      },
    }
  }
  [Symbol.iterator]() {
    return this.messages
      .filter(m => m.expr === undefined || m.expr > Date.now())
      [Symbol.iterator]()
  }
}

module.exports = MemoryStore
