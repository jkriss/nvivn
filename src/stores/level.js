const debug = require('debug')('nvivn:store:level')
const filter = require('../util/filter')
const monotonicTmestamp = require('monotonic-timestamp')
const sub = require('subleveldown')
const { promisify } = require('es6-promisify')
const streamIterator = require('../util/stream-iterator')

const timestamp = date => {
  if (!date) return monotonicTmestamp().toString(36)
  if (typeof date === 'number') return date.toString(36)
  if (date.getTime) return date.getTime().toString(36)
}

const clearDb = async db => {
  const ops = []
  const keys = streamIterator(db.createKeyStream())
  for await (const k of keys) {
    debug('handling key', k)
    ops.push({ type: 'del', key: k })
  }
  debug('running', ops)
  await db.batch(ops)
}

class LevelStore {
  constructor(opts = {}) {
    if (!opts.db)
      throw new Error('Must supply a db argument with a level instance')
    // debug('new level store with opts', opts)
    this.publicKey = opts.publicKey
    this.topLevelDb = opts.db
    this.db = sub(opts.db, 'main', { valueEncoding: 'json' })
    this.hashesDb = sub(opts.db, 'hashes')
  }
  async write(message) {
    const exists = await this.exists(message.meta.hash)
    if (exists) return
    const t = timestamp()
    // debug("timestamp", t, "for hash", message.meta.hash)
    debug('writing hash', message.meta.hash)
    await this.hashesDb.put(message.meta.hash, t)
    return this.db.put(t, message)
  }
  async get(hash) {
    let result
    try {
      const t = await this.hashesDb.get(hash)
      debug('found timestamp', t, 'for hash', hash)
      result = await this.db.get(t)
    } catch (err) {
      // debug("err:", err)
      if (err.notFound) return null
      throw err
    }
    // const m = JSON.parse(result.toString())
    const m = result
    if (m && m.expr !== undefined && m.expr <= Date.now()) {
      this.del(m.meta.hash)
      return null
    }
    return m
  }
  async exists(hash) {
    debug('-- checking hash:', hash)
    let result
    try {
      result = await this.hashesDb.get(hash)
      return true
    } catch (err) {
      debug('error while checking exists:', err)
      if (err.notFound) {
        return false
      }
      throw err
    }
  }
  async clear() {
    debug('--- clearing ---')
    await clearDb(this.db)
    await clearDb(this.hashesDb)
    debug('--- cleared ---')
  }
  async del(hash) {
    const t = await this.hashesDb.get(hash)
    const m = await this.db.get(t)
    await this.db.del(t)
    await this.hashesDb.del(hash)
  }
  async *messageGenerator(q) {
    let limit = -1
    if (q && q.$limit) {
      limit = q.$limit
      delete q.$limit
    }
    const f = q ? filter(q, { publicKey: this.publicKey }) : null
    const messages = streamIterator(
      this.db.createValueStream({ reverse: true })
    )
    let count = 0
    for await (const m of messages) {
      if (!f || (f && f(m))) {
        if (m && m.expr !== undefined && m.expr <= Date.now()) {
          this.del(m.meta.hash)
        } else {
          yield m
          count++
          if (limit !== -1 && count >= limit) return
        }
      }
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
