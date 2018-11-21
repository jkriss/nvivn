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
  async writeHash(hash) {
    return new Promise((resolve, reject) => {
      const ws = this.hashes.createWriteStream(getHashPath(hash))
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
  async exists(hash) {
    return this.hashExists(getHashPath(hash))
  }
  async del(hash) {
    debug('!!!!! deleting', hash)
    const exists = await this.exists(hash)
    // if (!exists) return
    const lockfilePath = `${this.filepath}.lock`
    try {
      await lock(lockfilePath, { wait: 5000 })
      debug('--- got lock ---')
    } catch (err) {
      console.error('error getting lock', err)
      throw err
    }
    const tmpPath = await tmpFile()
    const writeStream = ndjson.stringify()
    writeStream.pipe(fs.createWriteStream(tmpPath))
    for await (const m of this.filter(null, { skipDeletes: true })) {
      if (m.meta.hash !== hash) {
        writeStream.write(m)
      }
    }
    writeStream.end()
    await fs.move(tmpPath, this.filepath, { overwrite: true })
    await unlock(lockfilePath)
    debug('this.del deleting hash')
    await this.deleteHash(getHashPath(hash))
    debug('-- released lock --')
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
  async *messageGenerator(q, opts = {}) {
    const deleteQueue = []
    const f =
      q && Object.keys(q).length > 0
        ? filter(q, { publicKey: this.publicKey })
        : null
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
        return self.messageGenerator(q, opts)
      },
    }
  }

  [Symbol.asyncIterator]() {
    return this.messageGenerator()
  }
}

module.exports = FileStore
