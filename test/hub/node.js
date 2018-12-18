const tap = require('tap')
const makeHub = require('../../src/hub/node')

tap.test(`make a node hub`, async function(t) {
  const hub = await makeHub()
  t.ok(hub)
  const info = await hub.info()
  t.ok(info)
  t.ok(info.publicKey)
  hub.close()
})

tap.test(`post a message`, async function(t) {
  const hub = await makeHub({
    settings: { messageStore: 'leveldb:./test/tmp/node-messages' },
  })
  const m = await hub
    .create({ body: 'hi!' })
    .then(hub.sign)
    .then(hub.post)
  const sameMessage = await hub.list().then(results => results[0])
  t.same(m.body, 'hi!')
  t.same(m.body, sameMessage.body)
  hub.close()
})
