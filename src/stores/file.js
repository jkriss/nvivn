const debug = require('debug')('nvivn:store:file')
const path = require('path')
const fs = require('fs-extra')
const ndjson = require('ndjson')
const util = require('util')
const tmpFile = util.promisify(require('tmp').file)
const filter = require('../util/filter')
const blobStore = require('fs-blob-store')
const promisify = require('util').promisify
const PQueue = require('p-queue')
const backwardsStream = require('fs-reverse')
const through2 = require('through2')
const sinceExtractor = require('../util/since')

const waitUntilReadable = stream => {
  return new Promise((resolve, reject) => {
    const cb = () => {
      stream.removeListener('readable', cb)
      stream.removeListener('end', cb)
      resolve()
    }
    const errCb = err => {
      stream.removeListener('error', errCb)
      reject(err)
    }
    stream.on('error', errCb)
    stream.on('readable', cb)
    stream.on('end', cb)
  })
}

const getHashPath = hash => {
  return path.join(hash.slice(0, 2), hash)
}

class FileStore {
  constructor(opts = {}) {
    this.publicKey = opts.publicKey
    const filename = opts.filename || 'messages.txt'
    this.filepath =
      opts.filepath || path.join(opts.path || process.cwd(), filename)
    this.hashesFilepath = this.filepath + '-hashes'
    debug('storing hashes at', this.hashesFilepath)
    this.hashes = blobStore(this.hashesFilepath)
    // this.deleteHash = promisify(this.hashes.remove).bind(this.hashes)
    this.hashExists = promisify(this.hashes.exists).bind(this.hashes)
    this.operationQueue = new PQueue({ concurrency: 1 })
  }
  async deleteHash(hashPath) {
    debug('!! deleting hash path', hashPath)
    return new Promise((resolve, reject) => {
      this.hashes.remove(hashPath, err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
  async writeHash(hash, data) {
    return new Promise((resolve, reject) => {
      const ws = this.hashes.createWriteStream(getHashPath(hash))
      ws.write(JSON.stringify(data) || '')
      ws.on('error', err => reject(err))
      ws.end(() => resolve())
    })
  }
  async get(hash) {
    debug('getting', hash)
    const exists = await this.exists(hash)
    if (!exists) return null
    for await (const m of this) {
      // debug('checking', m)
      if (m.meta.hash === hash) {
        if (m.expr !== undefined && m.expr <= Date.now()) {
          this.del(m.meta.hash)
          return null
        } else {
          return m
        }
      }
    }
  }
  async exists(hash) {
    return this.hashExists(getHashPath(hash))
  }
  async del(hash) {
    return this.operationQueue.add(async () => {
      const result = await this._del(hash)
      return result
    })
  }
  async _del(hash) {
    debug('!!!!! deleting', hash)
    const exists = await this.exists(hash)
    debug('exists?', exists)
    if (!exists) return
    const tmpPath = await tmpFile()
    let writeStream = ndjson.stringify()
    let out = writeStream

    out.pipe(fs.createWriteStream(tmpPath))
    for await (const m of this.filter(null, {
      skipDeletes: true,
      backwards: false,
    })) {
      if (m.meta.hash !== hash) {
        writeStream.write(m)
      }
    }
    await new Promise(resolve => {
      writeStream.end(() => resolve())
    })
    await fs.move(tmpPath, this.filepath, { overwrite: true })
    debug('this.del deleting hash')
    await this.deleteHash(getHashPath(hash))
  }
  async write(message) {
    return this.operationQueue.add(async () => {
      const result = await this._write(message)
      return result
    })
  }
  async _write(message) {
    const exists = await this.exists(message.meta.hash)
    debug(`${message.meta.hash} exists already? ${exists}`)
    if (!exists) {
      const sig = message.meta.signed.find(s => s.publicKey === this.publicKey)
      const seen = sig.t
      await this.writeHash(message.meta.hash, { seen })
      // return fs.appendFile(this.filepath, JSON.stringify(message) + '\n')
      return new Promise((resolve, reject) => {
        let out = fs.createWriteStream(this.filepath, { flags: 'a' })
        out.on('error', err => {
          reject(err)
        })
        debug('writing stringified object')
        out.end(JSON.stringify(message) + '\n', () => {
          debug('!! finished write !!')
          resolve()
        })
      })
    } else {
      return false
    }
  }
  async clear() {
    await fs.writeFile(this.filepath, '')
    await fs.remove(this.hashesFilepath)
  }
  async *messageGenerator(q, opts = {}) {
    let sinceCheck = () => true
    if (q && q.since) {
      sinceCheck = sinceExtractor({ since: q.since, publicKey: this.publicKey })
    }
    const deleteQueue = []
    const f =
      q && Object.keys(q).length > 0
        ? filter(q, { publicKey: this.publicKey })
        : null
    await fs.ensureFile(this.filepath)
    let readStream
    if (opts.backwards) {
      const addLine = through2.obj(function(chunk, enc, callback) {
        // console.log("!!! got chunk", chunk, JSON.stringify(chunk))
        if (chunk.trim() !== '') this.push(chunk + '\n')
        callback()
      })
      readStream = backwardsStream(this.filepath)
        .pipe(addLine)
        .pipe(ndjson.parse())
    } else {
      readStream = fs.createReadStream(this.filepath).pipe(ndjson.parse())
    }
    await waitUntilReadable(readStream)
    let obj
    do {
      obj = readStream.read()
      if (!obj) {
        await waitUntilReadable(readStream)
        obj = readStream.read()
      }
      if (obj) {
        const passesSince = sinceCheck(obj)
        if (!passesSince) {
          debug(`message is older than since query`, obj, 'returning')
          readStream.destroy()
          break
        }
        const expired = obj.expr !== undefined && obj.expr <= Date.now()
        // debug("!! expired?", expired)
        if (!expired) {
          if (!f || (f && f(obj))) {
            yield await obj
          }
        } else if (!opts.skipDeletes) {
          debug('deleting', obj.meta.hash)
          deleteQueue.push(obj.meta.hash)
          // await this.del(obj.meta.hash)
        }
      }
    } while (obj)
    for (const h of deleteQueue) {
      debug('actually deleting', h)
      await this.del(h)
      debug('done deleting', h)
    }
    // await Promise.all(deleteQueue.map(h => this.del(h)))
  }

  filter(q, opts) {
    const self = this
    return {
      [Symbol.asyncIterator]() {
        return self.messageGenerator(
          q,
          Object.assign({ backwards: true }, opts)
        )
      },
    }
  }

  [Symbol.asyncIterator]() {
    return this.messageGenerator()
  }
}

module.exports = FileStore
