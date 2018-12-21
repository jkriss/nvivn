const tap = require('tap')
const signatures = require('sodium-signatures')
const { create, post, del, list } = require('../../src/commands/index')
const { encode } = require('../../src/util/encoding')
const MemoryStore = require('../../src/stores/memory')

tap.test('soft delete, with a record', async function(t) {
  const keys = signatures.keyPair()
  const messageStore = new MemoryStore()
  const m = create('hi')
  const posted = await post(m, { messageStore, keys, skipValidation: true })
  // console.log("posted message", posted)
  t.ok(posted, 'posted a message')
  t.equal(posted.meta.signed.length, 1, `it's been signed once`)
  const mExists = await messageStore.exists(m.meta.hash)
  t.true(mExists)
  const deletedMessage = await del(
    { hash: m.meta.hash },
    { messageStore, keys }
  )
  t.equal(posted.meta.signed.length, 2, 'added a signature')
  const deletionSignature = posted.meta.signed.find(s => s.type === 'deletion')
  t.ok(deletionSignature, 'added a deletion signature')
  const refetchedMessage = await messageStore.get(m.meta.hash)
  t.ok(refetchedMessage, 'the message is still fetchable')
  t.same(refetchedMessage.body, null, 'the body has been cleared')
  t.same(refetchedMessage.deleted, true, 'deleted flag should now be true')
  t.equal(
    refetchedMessage.meta.signed.length,
    2,
    'the two signatures are present on the cleared object'
  )
})

tap.test('properly sync a soft delete', async function(t) {
  const k1 = signatures.keyPair()
  const k2 = signatures.keyPair()
  const store1 = new MemoryStore({ publicKey: encode(k1.publicKey) })
  const store2 = new MemoryStore({ publicKey: encode(k2.publicKey) })
  const m = create('hi')
  const posted1 = await post(m, {
    messageStore: store1,
    keys: k1,
    skipValidation: true,
  })
  t.ok(posted1, 'posted to store 1')
  const posted2 = await post(m, {
    messageStore: store2,
    keys: k2,
    skipValidation: true,
  })
  t.ok(posted2, 'posted to store 2')
  const deletedMessage = await del(
    { hash: m.meta.hash },
    {
      messageStore: store1,
      keys: k1,
    }
  )
  t.ok(deletedMessage, 'get the deleted message back')
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
    // console.log('change!', newMessage)
    count++
    // sync the change to store2
    await post(newMessage, { messageStore: store2, keys: k2 })
  }
  t.equal(count, 1)
  const refetchedMessage2 = await store2.get(m.meta.hash)
  t.ok(refetchedMessage2)
  t.same(refetchedMessage2.body, null)
  t.same(refetchedMessage2.deleted, true)
})

tap.test('hard delete', async function(t) {
  const keys = signatures.keyPair()
  const messageStore = new MemoryStore()
  const m = create('hi')
  const posted = await post(m, { messageStore, keys, skipValidation: true })
  t.ok(posted, 'posted message')
  const mExists = await messageStore.exists(m.meta.hash)
  t.ok(mExists, 'message exists')
  await del({ hash: m.meta.hash, hard: true }, { messageStore, keys })
  const stillExists = await messageStore.exists(m.meta.hash)
  t.notOk(stillExists, `shouldn't exist after a hard delete`)
  const refetchedMessage = await messageStore.get(m.meta.hash)
  t.notOk(refetchedMessage, 'refetching message should return null')
})
