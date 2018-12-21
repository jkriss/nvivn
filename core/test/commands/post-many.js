const tap = require('tap')
const signatures = require('sodium-signatures')
const { decode } = require('../../src/util/encoding')
const { create, postMany } = require('../../src/commands/index')
const MemoryStore = require('../../src/stores/memory')

tap.test('post multiple messages', async function(t) {
  const messageStore = new MemoryStore()
  const m1 = create('hi')
  const m2 = create('hi again')
  const posted = await postMany(
    { messages: [m1, m2] },
    { messageStore, skipValidation: true }
  )
  t.ok(posted)
  const m1Exists = await messageStore.exists(m1.meta.hash)
  t.true(m1Exists)
  const m2Exists = await messageStore.exists(m1.meta.hash)
  t.true(m2Exists)
})
