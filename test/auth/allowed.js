const tap = require('tap')
const {
  createClient,
  createServer,
  createServerClientPair,
} = require('../helpers')
const createInProcessTransport = require('../../src/server/in-process')
const { verify } = require('../../src/index')

const customLogic = {
  isAllowed: async function({ command, userPublicKey, trustedKeys }) {
    if (trustedKeys.includes(userPublicKey)) return true
    const allowMessage = await this.client
      .list({ type: 'allow', publicKey: userPublicKey, $limit: 1 })
      .then(results => results[0])
    const verified = allowMessage && verify(allowMessage, { all: true })
    if (!verified) return false
    if (allowMessage.commands) {
      return allowMessage.commands.includes(command)
    }
    return verified
  },
}

tap.test(`let a trusted key add access via message`, async function(t) {
  const { client, server } = await createServerClientPair()
  server.setCustomLogic(customLogic)
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
  server.setCustomLogic(customLogic)
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
