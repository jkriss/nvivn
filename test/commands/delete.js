const tap = require('tap')
const signatures = require('sodium-signatures')
const { create, post, del, list } = require('../../src/index')
const { encode } = require('../../src/util/encoding')
const MemoryStore = require('../../src/stores/memory')

tap.test('soft delete, with a record', async function(t) {
  const keys = signatures.keyPair()
  const messageStore = new MemoryStore()
  const m = create('hi')
  // console.log("created message:", m)
  const posted = await post(m, { messageStore, keys })
  // console.log("posted message", posted)
  t.ok(posted)
  t.equal(posted.meta.signed.length, 1)
  const mExists = await messageStore.exists(m.meta.hash)
  t.true(mExists)
  const deletedMessage = await del(m.meta.hash, { messageStore, keys })
  t.equal(posted.meta.signed.length, 2)
  const deletionSignature = posted.meta.signed.find(s => s.type === 'deletion')
  t.ok(deletionSignature)
  const refetchedMessage = await messageStore.get(m.meta.hash)
  t.ok(refetchedMessage)
  t.same(refetchedMessage.body, null)
  t.equal(refetchedMessage.meta.signed.length, 2)
})

tap.test('properly sync a soft delete', async function(t) {
  const k1 = signatures.keyPair()
  const k2 = signatures.keyPair()
  const store1 = new MemoryStore({ publicKey: encode(k1.publicKey) })
  const store2 = new MemoryStore({ publicKey: encode(k2.publicKey) })
  const m = create('hi')
  const posted1 = await post(m, { messageStore: store1, keys: k1 })
  const posted2 = await post(m, { messageStore: store2, keys: k2 })
  const deletedMessage = await del(m.meta.hash, {
    messageStore: store1,
    keys: k1,
  })
  const deletionTime = deletedMessage.meta.signed.find(
    s => s.type === 'deletion'
  ).t
  const refetchedMessage = await store1.get(m.meta.hash)
  t.ok(refetchedMessage)
  t.same(refetchedMessage.body, null)
  // get the change list
  const changes = await list(
    { since: deletionTime - 1 },
    { messageStore: store1 }
  )
  let count = 0
  for await (const newMessage of changes) {
    console.log('change!', newMessage)
    count++
    // sync the change to store2
    await post(newMessage, { messageStore: store2, keys: k2 })
  }
  t.equal(count, 1)
  const refetchedMessage2 = await store2.get(m.meta.hash)
  t.ok(refetchedMessage2)
  t.same(refetchedMessage2.body, null)
})

tap.test('hard delete', async function(t) {
  const keys = signatures.keyPair()
  const messageStore = new MemoryStore()
  const m = create('hi')
  const posted = await post(m, { messageStore, keys })
  t.ok(posted)
  const mExists = await messageStore.exists(m.meta.hash)
  t.ok(mExists)
  await del(m.meta.hash, { messageStore, keys, hard: true })
  const stillExists = await messageStore.exists(m.meta.hash)
  t.notOk(stillExists)
  const refetchedMessage = await messageStore.get(m.meta.hash)
  t.notOk(refetchedMessage)
})
