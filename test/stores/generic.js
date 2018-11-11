const tap = require('tap')
const create = require('../../src/commands/create')

module.exports = (StoreClass, opts) => {
  tap.test('add a message', async function(t) {
    const m = create('hi')
    const store = new StoreClass(opts)
    await store.write(m)
    const stored = await store.get(m.meta.hash)
    t.same(m, stored)
  })

  tap.test('delete a message', async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    await store.write(m2)
    await store.del(m1.meta.hash)
    const stored1 = await store.get(m1.meta.hash)
    t.notOk(stored1)
    const stored2 = await store.get(m2.meta.hash)
    t.ok(stored2)
    t.same(m2, stored2)
  })

  tap.test('delete multiple messages simultaneously', async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    await store.write(m2)
    await Promise.all([store.del(m1.meta.hash), store.del(m2.meta.hash)])
    const stored1 = await store.get(m1.meta.hash)
    t.notOk(stored1)
    const stored2 = await store.get(m2.meta.hash)
    t.notOk(stored2)
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

  tap.test('clear the store', async function(t) {
    const m1 = create('hi')
    const store = new StoreClass(opts)
    await store.write(m1)
    const m1Exists = await store.exists(m1)
    t.true(m1Exists)
    await store.clear()
    const m1StillExists = await store.exists(m1)
    t.false(m1StillExists)
  })

  tap.test('test iterator', async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.clear()
    await store.write(m1)
    await store.write(m2)
    let items = 0
    const hashes = []
    for await (m of store) {
      items++
      hashes.push(m.meta.hash)
    }
    t.equal(items, 2)
    t.same(hashes, [m1.meta.hash, m2.meta.hash])
  })
}
