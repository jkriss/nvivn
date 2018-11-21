const debug = require('debug')('nvivn:store:file')
const path = require('path')
const fs = require('fs-extra')
const ndjson = require('ndjson')
const util = require('util')
const tmpFile = util.promisify(require('tmp').file)
const lockfile = require('lockfile')
const lock = util.promisify(lockfile.lock)
const unlock = util.promisify(lockfile.unlock)
const filter = require('../util/filter')
const blobStore = require('fs-blob-store')
const promisify = require('util').promisify

const waitUntilReadable = stream => {
  return new Promise((resolve, reject) => {
    const cb = () => {
      stream.removeListener('readable', cb)
      resolve()
    }
    const errCb = err => {
      stream.removeListener('error', errCb)
      reject(err)
    }
    stream.on('error', errCb)
    stream.on('readable', cb)
  })
}

class FileStore {
  constructor(opts = {}) {
    const filename = opts.filename || 'messages.txt'
    this.filepath =
      opts.filepath || path.join(opts.path || process.cwd(), filename)
    this.hashesFilepath = this.filepath + '-hashes'
    debug('storing hashes at', this.hashesFilepath)
    this.hashes = blobStore(this.hashesFilepath)
    this.deleteHash = promisify(this.hashes.remove).bind(this.hashes)
    this.exists = promisify(this.hashes.exists).bind(this.hashes)
  }
  async writeHash(hash) {
    return new Promise((resolve, reject) => {
      const ws = this.hashes.createWriteStream(hash)
      ws.write('')
      ws.on('error', err => reject(err))
      ws.end(() => resolve())
    })
  }
  async get(hash) {
    for await (const m of this) {
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
  async del(hash) {
    const exists = await this.exists(hash)
    if (!exists) return
    const lockfilePath = `${this.filepath}.lock`
    await lock(lockfilePath, { wait: 5000 })
    const tmpPath = await tmpFile()
    const writeStream = ndjson.stringify()
    writeStream.pipe(fs.createWriteStream(tmpPath))
    for await (const m of this) {
      if (m.meta.hash !== hash) {
        writeStream.write(m)
      }
    }
    writeStream.end()
    await fs.move(tmpPath, this.filepath, { overwrite: true })
    await this.deleteHash(hash)
    await unlock(lockfilePath)
  }
  async write(message) {
    const exists = await this.exists(message.meta.hash)
    debug(`${message.meta.hash} exists already? ${exists}`)
    if (!exists) {
      await this.writeHash(message.meta.hash)
      return fs.appendFile(this.filepath, JSON.stringify(message) + '\n')
    } else {
      return false
    }
  }
  async clear() {
    await fs.writeFile(this.filepath, '')
    await fs.remove(this.hashesFilepath)
  }
  async *messageGenerator(q) {
    const f = q && Object.keys(q).length > 0 ? filter(q) : null
    await fs.ensureFile(this.filepath)
    const readStream = fs.createReadStream(this.filepath).pipe(ndjson.parse())
    await waitUntilReadable(readStream)
    let obj
    do {
      obj = readStream.read()
      if (!obj) {
        await waitUntilReadable(readStream)
        obj = readStream.read()
      }
      if (obj) {
        if (obj.expr === undefined || obj.expr > Date.now()) {
          if (!f || (f && f(obj))) {
            yield await obj
          }
        } else {
          this.del(obj)
        }
      }
    } while (obj)
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

module.exports = FileStore
