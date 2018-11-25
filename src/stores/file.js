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
const fecha = require('fecha')

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
    this.path = opts.path || 'messages'
    this.messagesDir = path.join(this.path, 'messages')
    this.datePattern = opts.datePattern || 'YYYY-MM-DD'
    this.hashesFilepath = path.join(this.path, 'hashes')
    this.hashes = blobStore(this.hashesFilepath)
    this.hashExists = promisify(this.hashes.exists).bind(this.hashes)
    this.operationQueue = new PQueue({ concurrency: 1 })
  }
  async getHash(hash) {
    // const exists = await this.hashExists(hash)
    // if (!exists) return null
    return new Promise((resolve, reject) => {
      const readStream = this.hashes
        .createReadStream(getHashPath(hash))
        .pipe(ndjson.parse())
      readStream.on('err', err => reject(err))
      readStream.on('data', meta => {
        resolve(meta)
      })
    })
  }
  getFilepath(t) {
    if (!t) t = Date.now()
    return path.join(
      this.messagesDir,
      fecha.format(new Date(t), this.datePattern) + '.txt'
    )
  }
  async getFilepathForHash(hash) {
    const meta = await this.getHash(hash)
    return meta.file
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
    debug('exists?', exists)
    if (!exists) return null
    const file = await this.getFilepathForHash(hash)
    const readStream = fs.createReadStream(file).pipe(ndjson.parse())
    return new Promise(resolve => {
      readStream.on('data', m => {
        if (m.meta.hash === hash) {
          if (m.expr !== undefined && m.expr <= Date.now()) {
            this.del(m.meta.hash)
            resolve(null)
          } else {
            resolve(m)
            readStream.destroy()
          }
        }
      })
    })
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

    const file = await this.getFilepathForHash(hash)
    const readStream = fs.createReadStream(file).pipe(ndjson.parse())
    out.pipe(fs.createWriteStream(tmpPath))
    readStream.on('data', m => {
      if (m.meta.hash !== hash) {
        writeStream.write(m)
      }
    })
    // }
    await new Promise(resolve => {
      readStream.on('end', () => {
        writeStream.end(() => resolve())
      })
    })
    await fs.move(tmpPath, file, { overwrite: true })
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
      const sig =
        message.meta.signed &&
        message.meta.signed.find(s => s.publicKey === this.publicKey)
      const seen = (sig && sig.t) || Date.now()
      const file = await this.getFilepath(seen)
      await this.writeHash(message.meta.hash, { seen, file })
      // return fs.appendFile(this.filepath, JSON.stringify(message) + '\n')
      return new Promise(async (resolve, reject) => {
        await fs.ensureFile(file)
        let out = fs.createWriteStream(file, { flags: 'a' })
        out.on('error', err => {
          reject(err)
        })
        debug('writing stringified object')
        out.end(JSON.stringify(message) + '\n', () => {
          debug('!! finished write !!', message.meta.hash)
          resolve()
        })
      })
    } else {
      return false
    }
  }
  async clear() {
    await fs.remove(this.path)
  }
  async *messageGenerator(q, opts = {}) {
    console.log('-- filtering ')
    let sinceCheck = () => true
    if (q && q.since) {
      sinceCheck = sinceExtractor({ since: q.since, publicKey: this.publicKey })
    }
    let limit = -1
    if (q && q.$limit) {
      limit = q.$limit
      delete q.$limit
    }
    const deleteQueue = []
    const f =
      q && Object.keys(q).length > 0
        ? filter(q, { publicKey: this.publicKey })
        : null
    // await fs.ensureFile(this.filepath)
    await fs.ensureDir(this.messagesDir)
    let files = await fs.readdir(this.messagesDir)
    // sort these so they're newest first
    files = files.sort()
    if (opts.backwards) files = files.reverse()
    files = files.map(f => path.join(this.messagesDir, f))
    debug('reading files', files)
    let done = false
    let count = 0
    for (const file of files) {
      if (done) break
      let readStream
      if (opts.backwards) {
        const addLine = through2.obj(function(chunk, enc, callback) {
          // console.log("!!! got chunk", chunk, JSON.stringify(chunk))
          if (chunk.trim() !== '') this.push(chunk + '\n')
          callback()
        })
        readStream = backwardsStream(file)
          .pipe(addLine)
          .pipe(ndjson.parse())
      } else {
        readStream = fs.createReadStream(file).pipe(ndjson.parse())
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
            // debug(`message is older than since query`, obj, 'returning')
            readStream.destroy()
            done = true
            break
          }
          const expired = obj.expr !== undefined && obj.expr <= Date.now()
          // debug("!! expired?", expired)
          if (!expired) {
            if (!f || (f && f(obj))) {
              if (limit === -1 || count < limit) {
                count++
                yield await obj
              } else {
                done = true
                break
              }
            }
          } else if (!opts.skipDeletes) {
            debug('deleting', obj.meta.hash)
            deleteQueue.push(obj.meta.hash)
            // await this.del(obj.meta.hash)
          }
        }
      } while (obj)
    }
    for (const h of deleteQueue) {
      debug('actually deleting', h)
      await this.del(h)
      debug('done deleting', h)
    }
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
