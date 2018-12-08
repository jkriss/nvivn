const tap = require('tap')
const {
  createClient,
  createServer,
  createServerClientPair,
} = require('../helpers')
const createInProcessTransport = require('../../src/server/in-process')
const allowMessages = require('../../src/auth/allow-messages')
const chain = require('../../src/auth/chain')

tap.test(`let a trusted key add access via message`, async function(t) {
  const { client, server } = await createServerClientPair()
  server.setCustomLogic(allowMessages)
  const transport = createInProcessTransport({ server })
  const otherClient = await createClient({ transport })
  const info = await client.info()
  t.ok(info)
  try {
    await otherClient.info()
  } catch (err) {
    t.ok(err)
    t.equal(err.statusCode, 403)
  }
  // now authorize
  const signedMessage = await client
    .create({
      type: 'allow',
      publicKey: otherClient.getPublicKey({ encoded: true }),
    })
    .then(client.sign)
  // cheat, just shove this into the server
  await server.client.post(signedMessage)
  const otherInfo = await otherClient.info()
  t.ok(otherInfo, 'it should now be allowed')
})

tap.test(`allow some commands but not others`, async function(t) {
  const { client, server } = await createServerClientPair()
  server.setCustomLogic(allowMessages)
  const transport = createInProcessTransport({ server })
  const otherClient = await createClient({ transport })
  const signedMessage = await client
    .create({
      type: 'allow',
      commands: ['info'],
      publicKey: otherClient.getPublicKey({ encoded: true }),
    })
    .then(client.sign)
  await server.client.post(signedMessage)
  const otherInfo = await otherClient.info()
  t.ok(otherInfo, 'info should be allowed')
  try {
    await otherClient.list()
    t.false(true, `this shouldn't succeed`)
  } catch (err) {
    t.ok(err)
    t.equal(err.statusCode, 403, 'list should throw an error')
  }
})

tap.test(`chain custom logic objects`, async function(t) {
  const { client, server } = await createServerClientPair()
  server.setCustomLogic(chain(allowMessages))
  const transport = createInProcessTransport({ server })
  const otherClient = await createClient({ transport })
  const signedMessage = await client
    .create({
      type: 'allow',
      commands: ['info'],
      publicKey: otherClient.getPublicKey({ encoded: true }),
    })
    .then(client.sign)
  await server.client.post(signedMessage)
  const otherInfo = await otherClient.info()
  t.ok(otherInfo, 'info should be allowed')
  try {
    await otherClient.list()
    t.false(true, `this shouldn't succeed`)
  } catch (err) {
    t.ok(err)
    t.equal(err.statusCode, 403, 'list should throw an error')
  }
})
