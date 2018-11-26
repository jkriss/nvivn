const debug = require('debug')('nvivn:store:level')
const filter = require('../util/filter')

const awaitNext = (iterator, opts = {}) => {
  return new Promise((resolve, reject) => {
    iterator.next((err, key, val) => {
      if (err) return reject(err)
      // debug('next iterator value:', val)
      if (opts.returnValue === 'value') {
        resolve(val ? val.toString() : undefined)
      } else {
        resolve(key ? key.toString() : undefined)
      }
    })
  })
}

class LevelStore {
  constructor(opts = {}) {
    if (!opts.db)
      throw new Error('Must supply a db argument with a level instance')
    debug('new level store with opts', opts)
    this.publicKey = opts.publicKey
    this.db = opts.db
  }
  write(message) {
    return this.db.put(message.meta.hash, JSON.stringify(message))
  }
  async get(hash) {
    let result
    try {
      result = await this.db.get(hash)
    } catch (err) {
      if (err.notFound) return null
      throw err
    }
    const m = JSON.parse(result.toString())
    if (m && m.expr !== undefined && m.expr <= Date.now()) {
      this.del(m.meta.hash)
      return null
    }
    return m
  }
  async exists(hash) {
    const result = await this.get(hash)
    return !!result
  }
  async clear() {
    const iterator = this.db.iterator()
    let hash = await awaitNext(iterator, { returnValue: 'key' })
    while (hash) {
      await this.del(hash)
      hash = await awaitNext(iterator, { returnValue: 'key' })
    }
  }
  async del(hash) {
    debug('deleting', hash)
    return this.db.del(hash)
  }
  async *messageGenerator(q) {
    let limit = -1
    if (q && q.$limit) {
      limit = q.$limit
      delete q.$limit
    }
    const f = q ? filter(q, { publicKey: this.publicKey }) : null
    const iterator = this.db.iterator()
    let m = await awaitNext(iterator, { returnValue: 'value' })
    let count = 0
    while (m) {
      m = JSON.parse(m)
      if (!f || (f && f(m))) {
        if (m && m.expr !== undefined && m.expr <= Date.now()) {
          this.del(m.meta.hash)
        } else {
          yield m
          count++
          if (limit !== -1 && count >= limit) return
        }
      }
      m = await awaitNext(iterator, { returnValue: 'value' })
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
