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
    return this.messages.find(m => m.meta.hash === hash)
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
  [Symbol.iterator]() {
    return this.messages[Symbol.iterator]()
  }
}

module.exports = MemoryStore
