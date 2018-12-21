const tap = require('tap')
const path = require('path')
const fs = require('fs-extra')
const LocalStorage = require('node-localstorage').LocalStorage
const { setup } = require('../../hub/browser')

const localStoragePath = path.join(__dirname, 'tmp', 'localstorage')
fs.ensureDirSync(path.dirname(localStoragePath))
const localStorage = new LocalStorage(localStoragePath)

tap.test(`make a browser/localstorage hub`, async function(t) {
  const hub = await setup({
    localStorage,
    settings: { messageStore: 'leveljs:.nvivn' },
  })
  t.ok(hub)
  const info = await hub.info()
  t.ok(info)
  t.ok(info.publicKey)
})

tap.test(`post a message`, async function(t) {
  const hub = await setup({
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
