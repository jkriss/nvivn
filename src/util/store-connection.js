const debug = require('debug')('nvivn:store:connection')
const url = require('url')
const { decode } = require('./encoding')

const getStore = (connectionString, opts = {}) => {
  let publicKey = opts.publicKey
  if (!publicKey) {
    publicKey = process.env.NVIVN_PUBLIC_KEY
  }
  if (!connectionString) connectionString = process.env.NVIVN_MESSAGE_STORE
  if (!connectionString) connectionString = 'file:./messages'
  debug('getting store for', connectionString)
  // const conn = url.parse(connectionString)
  const [type, pathname] = connectionString.split(':')
  // debug("parsed connection string", conn)
  let store
  if (type === 'file') {
    const FileStore = require('../stores/file')
    store = new FileStore({ path: pathname, publicKey })
  } else if (type === 'memory') {
    const MemoryStore = require('../stores/memory')
    store = new MemoryStore({ publicKey })
  } else if (type === 'leveldb') {
    const level = require('level')
    const db = level(pathname)
    const LevelStore = require('../stores/level')
    store = new LevelStore({ db, publicKey })
  } else if (type === 'leveljs') {
    const level = require('level-browserify')
    const db = level(pathname)
    const LevelStore = require('../stores/level')
    store = new LevelStore({ db, publicKey })
  } else if (type === 'nedb') {
    const NedbStore = require('../stores/nedb')
    store = new NedbStore({ filename: pathname, autoload: true, publicKey })
  }
  return store
}

module.exports = getStore

if (require.main === module) {
  console.log(getStore(process.argv.slice(2)[0]))
}
