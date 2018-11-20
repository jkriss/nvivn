const debug = require('debug')('nvivn:store:connection')
const url = require('url')
const FileStore = require('../stores/file')
const MemoryStore = require('../stores/memory')
const LevelStore = require('../../src/stores/level')
const level = require('level')

const getStore = connectionString => {
  if (!connectionString) connectionString = process.env.NVIVN_MESSAGE_STORE
  if (!connectionString) return null
  debug('getting store for', connectionString)
  // const conn = url.parse(connectionString)
  const [type, pathname] = connectionString.split(':')
  // debug("parsed connection string", conn)
  let store
  if (type === 'file') {
    store = new FileStore({ filepath: pathname })
  } else if (type === 'memory') {
    store = new MemoryStore()
  } else if (type === 'leveldb') {
    const db = level(pathname)
    store = new LevelStore({ db })
  }
  return store
}

module.exports = getStore

if (require.main === module) {
  console.log(getStore(process.argv.slice(2)[0]))
}
