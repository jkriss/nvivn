const filter = require('../util/filter')

class MemoryStore {
  constructor(opts = {}) {
    this.publicKey = opts.publicKey
    if (this.publicKey && typeof this.publicKey !== 'string') {
      throw new Error(
        `publicKey should be a base64 encoded string, not a ${typeof this
          .publicKey}`
      )
    }
    this.messages = []
    this.hashes = {}
  }
  async exists(hash) {
    return this.hashes[hash]
  }
  async write(message) {
    const exists = await this.exists(message.meta.hash)
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
  *filteredGenerator(q = {}) {
    let limit
    if (q.$limit) {
      limit = q.$limit
      delete q.$limit
    }
    const f = filter(q, { publicKey: this.publicKey })
    let count = 0
    for (const m of this) {
      count++
      if (count > limit) break
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
      .reverse()
      .filter(m => m.expr === undefined || m.expr > Date.now())
      [Symbol.iterator]()
  }
}

module.exports = MemoryStore
