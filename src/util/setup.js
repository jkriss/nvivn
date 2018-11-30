const loadConfig = require('./config')
const { encode } = require('./encoding')
const Client = require('../client/index')
const Server = require('../server/core')
const MemorySyncStore = require('../client/mem-sync-store')
const getStore = require('./store-connection')

const createClientServer = async (config, clientOpts = {}) => {
  if (!config) config = await loadConfig()
  const keys = config.keys
  const publicKey = encode(keys.publicKey)
  const messageStore = getStore(config.messageStore, { publicKey })
  // TODO change syncStore this based on config file, too
  let syncStore = new MemorySyncStore()
  if (config.syncStore) {
    const [type, filepath] = config.syncStore.split(':')
    if (type === 'file') {
      const FileSyncStore = require('../client/file-sync-store')
      syncStore = new FileSyncStore({ filepath })
    } else if (type !== 'memory') {
      throw new Error(`sync store of type ${type} is not supported`)
    }
  }
  const opts = Object.assign(
    {
      messageStore,
      keys,
      syncStore,
      peers: config.peers || [],
      info: config.info,
    },
    clientOpts
  )
  const client = new Client(opts)
  const server = new Server({ client, trustedKeys: config.trustedKeys })
  return { config, client, server }
}

module.exports = createClientServer
