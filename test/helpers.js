const signatures = require('sodium-signatures')
const Client = require('../src/client/index')
const Server = require('../src/server/core')
const MemoryStore = require('../src/stores/memory')
const { encode } = require('../src/util/encoding')
const { getConfigDb } = require('../src/util/config-db')

const createClient = async ({ keys, transport } = {}) => {
  if (!keys) keys = signatures.keyPair()
  const messageStore = new MemoryStore({ publicKey: encode(keys.publicKey) })
  const config = await getConfigDb()
  const client = new Client({ messageStore, keys, config })
  if (transport) client.setTransport(transport)
  return client
}

const createServer = async (opts = {}) => {
  if (!opts.keys) opts.keys = signatures.keyPair()
  const client = await createClient({ keys: opts.keys })
  const config = await getConfigDb({ data: { trustedKeys: opts.trustedKeys } })
  if (!opts.config) opts.config = config
  return new Server(Object.assign({ client }, opts))
}

const createServerClientPair = async () => {
  const keys = signatures.keyPair()
  const server = await createServer({ trustedKeys: [encode(keys.publicKey)] })
  const client = await createClient({ keys })
  return { server, client }
}

module.exports = {
  createClient,
  createServer,
  createServerClientPair,
}
