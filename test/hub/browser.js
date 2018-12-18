const tap = require('tap')
const path = require('path')
const LocalStorage = require('node-localstorage').LocalStorage
const makeHub = require('../../src/hub/browser')

const localStoragePath = path.join(__dirname, '..', 'tmp', 'localstorage')
const localStorage = new LocalStorage(localStoragePath)

tap.test(`make a browser/localstorage hub`, async function(t) {
  const hub = await makeHub({ localStorage })
  t.ok(hub)
  const info = await hub.info()
  t.ok(info)
  t.ok(info.publicKey)
})

tap.test(`post a message`, async function(t) {
  const hub = await makeHub({
    localStorage,
    settings: { messageStore: 'leveldb:./test/tmp/browser-messages' },
  })
  const m = await hub
    .create({ body: 'hi!' })
    .then(hub.sign)
    .then(hub.post)
  const sameMessage = await hub.list().then(results => results[0])
  t.same(m.body, 'hi!')
  t.same(m.body, sameMessage.body)
})
