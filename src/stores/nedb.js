const debug = require('debug')('nvivn:store:nedb')
const Datastore = require('nedb')
const { promisify } = require('es6-promisify')
const without = require('../util/without')
const datemath = require('datemath-parser')

const fetch = async (cursor, opts = {}) => {
  return new Promise((resolve, reject) => {
    cursor
      .skip(opts.skip)
      .limit(opts.limit)
      .exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs)
      })
  })
}

class NedbStore {
  constructor(opts = {}) {
    debug('nedb opts:', opts)
    this.db = new Datastore(opts)
    ;['insert', 'find', 'findOne', 'remove'].forEach(fn => {
      if (!this.db[fn]) throw new Error(`db object doesn't have a ${fn} method`)
      this[fn] = promisify(this.db[fn]).bind(this.db)
    })
    this.publicKey = opts.publicKey
    // this.db.ensureIndex({ fieldName: 'meta.hash' })
    this.db.ensureIndex({ fieldName: 't' })
    this.db.ensureIndex({ fieldName: 'type' })
  }
  async write(message) {
    // const exists = await this.exists(message.meta.hash)
    // if (!exists) return this.insert(message)
    return this.writeMany([message])
  }
  async writeMany(messages) {
    debug(`calling writeMany with ${messages.length} messages`)
    const exists = await Promise.all(
      messages.map(m => this.exists(m.meta.hash))
    )
    const stats = {
      existing: exists.filter(e => e).length,
      new: exists.filter(e => !e).length,
    }
    debug('stats:', stats)
    const newMessages = messages.filter((m, i) => !exists[i])
    const postedMessages = await this.insert(
      newMessages.map(m => Object.assign({ _id: m.meta.hash }, m))
    )
    return postedMessages.map(m => without(m, '_id'))
  }
  async get(hash) {
    const m = await this.findOne({ 'meta.hash': hash })
    if (m && m.expr !== undefined && m.expr <= Date.now()) {
      await this.del(m.meta.hash)
      return null
    }
    return m ? without(m, '_id') : null
  }
  async del(hash) {
    return this.remove({ 'meta.hash': hash })
  }
  exists(hash) {
    return this.findOne({ _id: hash }).then(r => !!r)
  }
  async clear() {
    await this.remove({}, { multi: true })
  }
  async *messageGenerator(query) {
    const q = Object.assign({}, query)
    if (q.since) {
      q.t = {
        $gt: typeof q.since === 'number' ? q.since : datemath.parse(q.since),
      }
      delete q.since
    }
    let idx = 0
    const pageSize = 100
    const cursor = this.db.find(q).sort({ t: -1 })

    let limit = -1
    if (q && q.$limit) {
      limit = q.$limit
      delete q.$limit
    }

    let results
    do {
      results = await fetch(cursor, {
        skip: idx,
        limit: limit !== -1 ? limit : pageSize,
      })
      for (const m of results) {
        if (m.expr === undefined || m.expr > Date.now()) {
          yield without(m, '_id')
        } else {
          await this.del(m.meta.hash)
        }
      }
      idx += pageSize
    } while (results.length === pageSize)
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

module.exports = NedbStore
