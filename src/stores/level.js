const debug = require('debug')('nvivn:store:level')
const ttl = require('level-ttl')
const filter = require('../util/filter')

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
    const checkFrequency = opts.checkFrequency || 10000
    debug('setting ttl check to', checkFrequency)
    ttl(this.db, { checkFrequency })
  }
  write(message) {
    // console.log("saving", message.meta.hash)
    const ttlOpts = {}
    if (message.expr !== undefined) {
      ttlOpts.ttl = Math.max(1, message.expr - Date.now())
      debug('!! set ttl to', ttlOpts.ttl)
    }
    return this.db.put(message.meta.hash, JSON.stringify(message), ttlOpts)
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
  async exists(hash) {
    const result = await this.get(hash)
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
  async *messageGenerator(q) {
    const f = q ? filter(q) : null
    const iterator = this.db.iterator()
    let hash = await awaitNext(iterator)
    while (hash) {
      const m = await this.get(hash)
      if (!f || (f && f(m))) {
        yield m
      }
      hash = await awaitNext(iterator)
    }
  }
  filter(q) {
    const self = this
    return {
      [Symbol.asyncIterator]() {
        return self.messageGenerator(q)
      },
    }
  }

  [Symbol.asyncIterator]() {
    return this.messageGenerator()
  }
}

module.exports = LevelStore
