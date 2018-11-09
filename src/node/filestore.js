const path = require('path')
const fs = require('fs-extra')
const ndjson = require('ndjson')

class FileStore {
  constructor(opts = {}) {
    const filename = opts.filename || 'messages.txt'
    this.filepath = path.join(opts.path || process.cwd(), filename)
  }
  async write(message) {
    return fs.appendFile(this.filepath, JSON.stringify(message) + '\n')
  }
  getReadStream() {
    return fs.createReadStream(this.filepath).pipe(ndjson.parse())
  }
}

module.exports = FileStore
