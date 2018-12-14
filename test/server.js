const tap = require('tap')
const tcp = require('../src/server/tcp')
const createHttpServer = require('../src/server/http')
const createHttpClient = require('../src/client/http')
const createInProcessTransport = require('../src/server/in-process')
const { encode } = require('../src/util/encoding')
const fs = require('fs-extra')
const sleep = require('await-sleep')
const {
  createClient,
  createServer,
  createServerClientPair,
} = require('./helpers')

tap.test(`don't allow access by untrusted keys`, async function(t) {
  t.plan(1)
  const server = await createServer()
  const client = await createClient()
  const m = await client.signCommand({ command: 'list' })
  const req = server.handle(m)
  req.on('error', m => {
    t.equal(m.type, 'error')
  })
  await new Promise(resolve => req.on('end', resolve))
})

tap.test(`empty list`, async function(t) {
  const { server, client } = await createServerClientPair()
  const m = await client.signCommand({ command: 'list' })
  const res = server.handle(m)
  await new Promise(resolve => res.on('end', resolve))
})

tap.test(`get server info`, async function(t) {
  const { server, client } = await createServerClientPair()
  const m = await client.signCommand({ command: 'info' })
  const res = server.handle(m)
  res.on('data', d => {
    t.ok(d.publicKey)
  })
  await new Promise(resolve => res.on('end', resolve))
})

tap.test(`run server over tcp`, async function(t) {
  const { server, client } = await createServerClientPair()
  const m = await client.signCommand({ command: 'info' })
  const socket = '/tmp/nvivn.sock'
  await fs.remove(socket)
  const tcpServer = tcp.createServerTransport({ server, listen: socket })
  await tcpServer.listen()
  try {
    // returns a promise, resolves when connected to the server
    const tcpClient = await tcp.createClientTransport({ path: socket })
    client.setTransport(tcpClient)
    t.ok(client.transport)
    const serverInfo = await client.info()
    t.ok(serverInfo)
    t.equal(serverInfo.publicKey, encode(server.getPublicKey()))
  } finally {
    client.close()
    tcpServer.close()
  }
})

tap.test(`run server over http`, async function(t) {
  const { server, client } = await createServerClientPair()
  const m = await client.signCommand({ command: 'info' })
  const port = 9898
  const httpServer = createHttpServer({ server })
  await httpServer.listen(port)
  try {
    const httpClient = await createHttpClient({
      url: `http://localhost:${port}`,
    })
    client.setTransport(httpClient)
    t.ok(client.transport)
    const serverInfo = await client.info()
    t.ok(serverInfo)
    t.equal(serverInfo.publicKey, encode(server.getPublicKey()))
  } finally {
    client.close()
    httpServer.close()
  }
})

tap.test(`pull from a server`, async function(t) {
  const server = await createServer()
  const client = server.client
  const otherClient = await createClient()
  server.config.set('newlayer', {
    trustedKeys: otherClient.defaultOpts.keys.publicKey,
  })
  for (let i = 0; i < 5; i++) {
    const posted = await client
      .create({ body: `hi ${i + 1}` })
      .then(client.sign)
      .then(client.post)
  }
  t.equal(client.defaultOpts.messageStore.messages.length, 5)
  const postedMessages = await client.list()
  t.equal(postedMessages.length, 5)
  const originalMessages = await otherClient.list()
  t.same(originalMessages, [])
  const transport = createInProcessTransport({ server })
  let syncResult = await otherClient.pull(
    { publicKey: client.getPublicKey({ encoded: true }) },
    { transport }
  )
  const newMessages = await otherClient.list()
  t.equal(newMessages.length, 5)
  t.equal(syncResult.count, 5)
  // now should only request newer messages
  syncResult = await otherClient.pull(
    { publicKey: client.getPublicKey({ encoded: true }) },
    { transport }
  )
  t.equal(syncResult.count, 0)
})

tap.test(`push to a server`, async function(t) {
  const server = await createServer()
  const client = server.client
  const otherClient = await createClient()
  server.config.set('newlayer', {
    trustedKeys: otherClient.defaultOpts.keys.publicKey,
  })
  for (let i = 0; i < 5; i++) {
    const posted = await otherClient
      .create({ body: `hi ${i + 1}` })
      .then(otherClient.sign)
      .then(otherClient.post)
  }
  t.equal(otherClient.defaultOpts.messageStore.messages.length, 5)
  const postedMessages = await otherClient.list()
  t.equal(postedMessages.length, 5)
  const transport = createInProcessTransport({ server })
  let syncResult = await otherClient.push(
    { publicKey: client.getPublicKey({ encoded: true }) },
    { transport }
  )
  t.equal(syncResult.count, 5)
  t.equal(client.defaultOpts.messageStore.messages.length, 5)
  const newMessages = await client.list()
  t.equal(newMessages.length, 5)
})

tap.test(`sync both ways`, async function(t) {
  const server = await createServer()
  const client = server.client
  const otherClient = await createClient()
  server.config.set('newlayer', {
    trustedKeys: otherClient.defaultOpts.keys.publicKey,
  })
  for (let i = 0; i < 2; i++) {
    const posted = await client
      .create({ body: `hi ${i + 1}` })
      .then(client.sign)
      .then(client.post)
  }
  for (let i = 0; i < 3; i++) {
    const posted = await otherClient
      .create({ body: `hi ${i + 1}` })
      .then(otherClient.sign)
      .then(otherClient.post)
  }
  const transport = createInProcessTransport({ server })
  const { push, pull } = await otherClient.sync(
    { publicKey: client.getPublicKey({ encoded: true }) },
    { transport }
  )
  t.equal(push.count, 5)
  // the pull includes the ones that were just pushed, but hashes won't be overwritten
  t.equal(pull.count, 2)
  t.equal(client.defaultOpts.messageStore.messages.length, 5)
  t.equal(otherClient.defaultOpts.messageStore.messages.length, 5)
})

tap.test(`sync both ways over http by url`, async function(t) {
  const server = await createServer()
  const client = server.client
  const otherClient = await createClient()
  const port = 9898
  const httpServer = createHttpServer({ server })
  await httpServer.listen(port)
  server.config.set('newlayer', {
    trustedKeys: otherClient.defaultOpts.keys.publicKey,
  })
  for (let i = 0; i < 2; i++) {
    const posted = await client
      .create({ body: `hi ${i + 1}` })
      .then(client.sign)
      .then(client.post)
  }
  for (let i = 0; i < 3; i++) {
    const posted = await otherClient
      .create({ body: `hi ${i + 1}` })
      .then(otherClient.sign)
      .then(otherClient.post)
  }
  try {
    const { push, pull } = await otherClient.sync({
      url: 'http://localhost:9898',
    })
    // console.log('push result:', push)
    // console.log('pull result:', pull)
    t.equal(push.count, 5)
    t.equal(pull.count, 2)
    t.equal(client.defaultOpts.messageStore.messages.length, 5)
    t.equal(otherClient.defaultOpts.messageStore.messages.length, 5)
  } finally {
    httpServer.close()
  }
})

tap.test(`sync a delete even if the hash has been seen already`, async function(
  t
) {
  const server = await createServer()
  const client = server.client
  const otherClient = await createClient()
  server.config.set('newlayer', {
    trustedKeys: otherClient.defaultOpts.keys.publicKey,
  })
  const m = await otherClient
    .create({ body: 'hi' })
    .then(otherClient.sign)
    .then(otherClient.post)
  t.equal(
    otherClient.defaultOpts.messageStore.messages.length,
    1,
    'saved a message'
  )
  t.equal(
    client.defaultOpts.messageStore.messages.length,
    0,
    'client is empty still'
  )
  const transport = createInProcessTransport({ server })
  let push = await otherClient.push(
    { publicKey: client.getPublicKey({ encoded: true }) },
    { transport }
  )
  t.equal(push.count, 1, 'pushed one message')
  t.equal(
    client.defaultOpts.messageStore.messages.length,
    1,
    'the client we pushed to has 1 message now'
  )

  await otherClient.del({ hash: m.meta.hash })
  // console.log("!!!!! the deleted message:", otherClient.defaultOpts.messageStore.messages)
  t.notOk(
    otherClient.defaultOpts.messageStore.messages[0].body,
    'after deletion, the message body should be null'
  )
  push = await otherClient.push(
    { publicKey: client.getPublicKey({ encoded: true }) },
    { transport }
  )
  t.equal(push.count, 1, 'should have pushed one message')
  t.equal(
    client.defaultOpts.messageStore.messages.length,
    1,
    'the client we pushed to should still have 1 message'
  )
  t.notOk(
    client.defaultOpts.messageStore.messages[0].body,
    'the client we pushed to should have a null message body'
  )
})

tap.test(
  `throw an error if public key doesn't match the expected value`,
  async function(t) {
    t.plan(2)
    const server = await createServer()
    const client = server.client
    const otherClient = await createClient()
    const port = 9898
    const httpServer = createHttpServer({ server })
    await httpServer.listen(port)
    server.config.set('newlayer', {
      trustedKeys: otherClient.defaultOpts.keys.publicKey,
    })
    try {
      await otherClient.pull({
        publicKey: 'notthekey',
        url: 'http://localhost:9898',
      })
    } catch (err) {
      t.ok(err)
      t.ok(
        err.message.includes('Expected public key notthekey'),
        'should have the error we expect'
      )
    } finally {
      httpServer.close()
    }
  }
)

tap.test(`let custom handlers get events`, function(t) {
  t.plan(2)
  const custom = {
    ready: server => {
      t.ok(server)
      server.on('message', m => {
        t.ok(m)
      })
    },
  }
  createServer().then(server => {
    server.setCustomLogic(custom)
    const c = server.client
    c.create({ body: 'hi' })
      .then(c.sign)
      .then(c.post)
  })
})

// // TODO verify signature of the info message and make sure the public key is the one that's signed
