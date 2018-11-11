const tap = require('tap')
const create = require('../../src/commands/create')

module.exports = (StoreClass, opts) => {
  tap.test('add a message', async function(t) {
    const m = create('hi')
    const store = new StoreClass(opts)
    t.equal(store.messages.length, 0)
    await store.write(m)
    t.equal(store.messages.length, 1)
  })

  tap.test('delete a message', async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    await store.write(m2)
    t.equal(store.messages.length, 2)
    await store.del(m1.meta.hash)
    t.equal(store.messages.length, 1)
    t.equal(store.messages[0], m2)
  })

  tap.test('test if a message exists', async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    const m1Exists = await store.exists(m1)
    t.true(m1Exists)
    const m2Exists = await store.exists(m2)
    t.false(m2Exists)
  })

  tap.test('test iterator', async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    await store.write(m2)
    let items = 0
    const hashes = []
    for (m of store) {
      items++
      hashes.push(m.meta.hash)
    }
    t.equal(items, 2)
    t.same(hashes, [m1.meta.hash, m2.meta.hash])
  })
}
