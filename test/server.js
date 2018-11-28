const tap = require('tap')
const signatures = require('sodium-signatures')
const Client = require('../src/client/index')
const Server = require('../src/server/core')
const MemoryStore = require('../src/stores/memory')
const MemorySyncStore = require('../src/client/mem-sync-store')

const createClient = ({ keys } = {}) => {
  if (!keys) keys = signatures.keyPair()
  const store = new MemoryStore({ publicKey: keys.publicKey })
  const syncStore = new MemorySyncStore()
  return new Client({ store, keys, syncStore })
}

const createServer = (opts = {}) => {
  const client = createClient({ keys: opts.keys })
  return new Server(Object.assign({ client }, opts))
}

const createServerClientPair = () => {
  const keys = signatures.keyPair()
  const server = createServer({ trustedKeys: [keys.publicKey] })
  const client = createClient({ keys })
  return { server, client }
}

tap.test(`don't allow access by untrusted keys`, async function(t) {
  t.plan(1)
  const server = createServer()
  const client = createClient()
  const m = await client.signCommand({ command: 'list' })
  server.handle(m)
  server.on('error', m => {
    t.equal(m.type, 'error')
  })
  await new Promise(resolve => server.on('end', resolve))
})

tap.test(`empty list`, async function(t) {
  const { server, client } = createServerClientPair()
  const m = await client.signCommand({ command: 'list' })
  server.handle(m)
  await new Promise(resolve => server.on('end', resolve))
})

tap.test(`get server info`, async function(t) {
  const { server, client } = createServerClientPair()
  const m = await client.signCommand({ command: 'info' })
  server.handle(m)
  server.on('data', d => {
    t.ok(d.publicKey)
  })
  await new Promise(resolve => server.on('end', resolve))
})
