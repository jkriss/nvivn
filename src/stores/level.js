const debug = require('debug')('nvivn:store:level')
const assert = require('assert')
const filter = require('../util/filter')
const monotonicTimestamp = require('monotonic-timestamp')
const sub = require('subleveldown')
const { promisify } = require('es6-promisify')
const streamIterator = require('../util/stream-iterator')
const sinceExtractor = require('../util/since')

const timestamp = date => {
  if (!date) return monotonicTimestamp().toString(36)
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
    this.publicKey = opts.publicKey
    this.topLevelDb = opts.db
    this.db = sub(opts.db, 'main', { valueEncoding: 'json' })
    this.hashesDb = sub(opts.db, 'hashes')
  }
  async write(message) {
    return this.writeMany([message])
  }
  async writeMany(messages) {
    const exists = await this.existsMany(messages.map(m => m.meta.hash))
    const newMessages = messages.filter((m, i) => !exists[i])
    const timestamps = newMessages.map(() => timestamp())
    const hashWrite = this.hashesDb.batch(
      newMessages.map((m, i) => {
        return { type: 'put', key: m.meta.hash, value: timestamps[i] }
      })
    )
    const messageWrite = this.db.batch(
      newMessages.map((m, i) => {
        return { type: 'put', key: timestamps[i], value: m }
      })
    )
    await Promise.all([hashWrite, messageWrite])
    return newMessages
  }
  async get(hash) {
    let result
    try {
      const t = await this.hashesDb.get(hash)
      debug('found timestamp', t, 'for hash', hash)
      result = await this.db.get(t)
    } catch (err) {
      if (err.notFound) return null
      throw err
    }
    const m = result
    if (m && m.expr !== undefined && m.expr <= Date.now()) {
      this.del(m.meta.hash)
      return null
    }
    return m
  }
  existsMany(hashes) {
    if (hashes[0])
      assert(
        typeof hashes[0] === 'string',
        `hashes must be strings, not ${typeof hashes[0]}`
      )
    return Promise.all(
      hashes.map(h => {
        return this.hashesDb.get(h).catch(err => {
          if (err.notFound) {
            return false
          } else {
            throw err
          }
          return true
        })
      })
    ).then(results => results.map(r => !!r))
  }
  exists(hash) {
    return this.existsMany([hash]).then(results => results[0])
  }
  async clear() {
    debug('--- clearing ---')
    await clearDb(this.db)
    await clearDb(this.hashesDb)
    debug('--- cleared ---')
  }
  async del(hash) {
    const exists = await this.exists(hash)
    if (!exists) return
    const t = await this.hashesDb.get(hash)
    const m = await this.db.get(t)
    await this.db.del(t)
    await this.hashesDb.del(hash)
  }
  async *messageGenerator(q) {
    debug('getting messages with q', q)
    let limit = -1
    if (q && q.$limit) {
      limit = q.$limit
      delete q.$limit
    }
    let sinceCheck = () => true
    if (q && q.since) {
      sinceCheck = sinceExtractor({ since: q.since, publicKey: this.publicKey })
    }
    const f = q ? filter(q, { publicKey: this.publicKey }) : null
    const messages = streamIterator(
      this.db.createValueStream({ reverse: true })
    )
    let count = 0
    for await (const m of messages) {
      const passesSince = sinceCheck(m)
      if (!passesSince) {
        debug('went back far enough, stopping now')
        break
      }
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
