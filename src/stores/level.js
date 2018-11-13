const debug = require('debug')('nvivn:store:level')

const awaitNext = iterator => {
  return new Promise((resolve, reject) => {
    iterator.next((err, val) => {
      if (err) return reject(err)
      debug('next iterator value:', val)
      resolve(val ? val.toString() : undefined)
    })
  })
}

class LevelStore {
  constructor(opts = {}) {
    if (!opts.db)
      throw new Error('Must supply a db argument with a level instance')
    this.db = opts.db
  }
  write(message) {
    // console.log("saving", message.meta.hash)
    return this.db.put(message.meta.hash, JSON.stringify(message))
  }
  async get(hash) {
    let result
    try {
      result = await this.db.get(hash)
    } catch (err) {
      // debug("!!!! catching error", err)
      if (err.notFound) return null
      throw err
    }
    return result ? JSON.parse(result.toString()) : null
  }
  async exists(message) {
    const result = await this.get(message.meta.hash)
    return !!result
  }
  async clear() {
    const iterator = this.db.iterator()
    let hash = await awaitNext(iterator)
    while (hash) {
      await this.del(hash)
      hash = await awaitNext(iterator)
    }
  }
  async del(hash) {
    debug('deleting', hash)
    return this.db.del(hash)
  }
  async *messageGenerator() {
    const iterator = this.db.iterator()
    let hash = await awaitNext(iterator)
    while (hash) {
      yield await this.get(hash)
      hash = await awaitNext(iterator)
    }
  }

  [Symbol.asyncIterator]() {
    return this.messageGenerator()
  }
}

module.exports = LevelStore
