const debug = require('debug')('nvivn:store:connection')
const url = require('url')
const FileStore = require('../stores/file')
const MemoryStore = require('../stores/memory')
const LevelStore = require('../../src/stores/level')
const NedbStore = require('../../src/stores/nedb')
const level = require('level')
const multibase = require('multibase')

const getStore = (connectionString, opts = {}) => {
  let publicKey = opts.publicKey
  if (!publicKey) {
    publicKey = multibase
      .encode('base58flickr', multibase.decode(process.env.NVIVN_PUBLIC_KEY))
      .toString()
  }
  if (!connectionString) connectionString = process.env.NVIVN_MESSAGE_STORE
  if (!connectionString) return null
  debug('getting store for', connectionString)
  // const conn = url.parse(connectionString)
  const [type, pathname] = connectionString.split(':')
  // debug("parsed connection string", conn)
  let store
  if (type === 'file') {
    store = new FileStore({ path: pathname, publicKey })
  } else if (type === 'memory') {
    store = new MemoryStore({ publicKey })
  } else if (type === 'leveldb') {
    const db = level(pathname)
    store = new LevelStore({ db, publicKey })
  } else if (type === 'nedb') {
    store = new NedbStore({ filename: pathname, autoload: true, publicKey })
  }
  return store
}

module.exports = getStore

if (require.main === module) {
  console.log(getStore(process.argv.slice(2)[0]))
}
