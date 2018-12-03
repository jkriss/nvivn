const { loadConfig } = require('./config')
const { encode } = require('./encoding')
const Client = require('../client/index')
const Server = require('../server/core')
const getStore = require('./store-connection')

const createClientServer = async (config, clientOpts = {}) => {
  if (!config) config = await loadConfig()
  const settings = await config.data()
  const keys = settings.keys
  const publicKey = encode(keys.publicKey)
  const messageStore = getStore(settings.messageStore, { publicKey })
  const opts = Object.assign(
    {
      messageStore,
      keys,
      config,
    },
    clientOpts
  )
  const client = new Client(opts)
  const server = new Server({ client, config })
  return { config, client, server }
}

module.exports = createClientServer
