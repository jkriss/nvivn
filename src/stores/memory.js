const filter = require('../util/filter')

class MemoryStore {
  constructor() {
    this.messages = []
  }
  async exists(message) {
    return !!this.messages.find(m => m.meta.hash === message.meta.hash)
  }
  async write(message) {
    this.messages.push(message)
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
    if (idx >= 0) {
      this.messages.splice(idx, 1)
    }
  }
  async clear() {
    this.messages = []
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
