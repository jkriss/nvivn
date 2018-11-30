const lockfile = require('proper-lockfile')
const fs = require('fs-extra')

class FileSyncStore {
  constructor({ filepath } = {}) {
    this.filepath = filepath || '.nvivn-sync'
  }
  async read() {
    await fs.ensureFile(this.filepath)
    const data = await fs.readJSON(this.filepath, { throws: false })
    return data || {}
  }
  async put(k, v) {
    const release = await lockfile.lock(this.filepath)
    const data = await this.read()
    data[k] = v
    await fs.writeJSON(this.filepath, data)
    release()
  }
  async get(k) {
    const data = await this.read()
    return data && data[k]
  }
}

module.exports = FileSyncStore
