const debug = require('debug')('nvivn:filestore')
const path = require('path')
const fs = require('fs-extra')
const ndjson = require('ndjson')
const stream = require('stream')
const util = require('util')
const tmpFile = util.promisify(require('tmp').file)
const lockfile = require('lockfile')
const lock = util.promisify(lockfile.lock)
const unlock = util.promisify(lockfile.unlock)

const waitUntilReadable = stream => {
  return new Promise((resolve, reject) => {
    stream.on('error', err => reject(err))
    stream.on('readable', () => resolve())
  })
}

class FileStore {
  constructor(opts = {}) {
    const filename = opts.filename || 'messages.txt'
    this.filepath = path.join(opts.path || process.cwd(), filename)
  }
  async exists(message) {
    const hash = message.meta.hash
    const m = await this.get(hash)
    return !!m
  }
  async get(hash) {
    for await (const m of this) {
      if (m.meta.hash === hash) return m
    }
  }
  async del(hash) {
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
    await unlock(lockfilePath)
  }
  async write(message) {
    const exists = await this.exists(message)
    debug(`${message.meta.hash} exists already? ${exists}`)
    if (!exists) {
      return fs.appendFile(this.filepath, JSON.stringify(message) + '\n')
    } else {
      return false
    }
  }
  async clear() {
    await fs.writeFile(this.filepath, '')
  }
  async *messageGenerator() {
    await fs.ensureFile(this.filepath)
    const readStream = fs.createReadStream(this.filepath).pipe(ndjson.parse())
    await waitUntilReadable(readStream)
    let obj = readStream.read()
    debug('read object:', obj)
    while (obj) {
      yield await obj
      obj = readStream.read()
      debug('read object:', obj)
    }
  }

  [Symbol.asyncIterator]() {
    return this.messageGenerator()
  }
}

module.exports = FileStore
