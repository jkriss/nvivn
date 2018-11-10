const debug = require('debug')('nvivn:filestore')
const path = require('path')
const fs = require('fs-extra')
const ndjson = require('ndjson')

class FileStore {
  constructor(opts = {}) {
    const filename = opts.filename || 'messages.txt'
    this.filepath = path.join(opts.path || process.cwd(), filename)
  }
  exists(message) {
    const hash = message.meta.hash
    return new Promise(async (resolve, reject) => {
      const fileExists = await fs.exists(this.filepath)
      if (!fileExists) return resolve(false)
      fs.createReadStream(this.filepath)
        .pipe(ndjson.parse())
        .on('data', function(m) {
          if (m.meta.hash === hash) resolve(true)
        })
        .on('end', () => resolve(false))
    })
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
  getReadStream() {
    return fs.createReadStream(this.filepath).pipe(ndjson.parse())
  }
}

module.exports = FileStore
