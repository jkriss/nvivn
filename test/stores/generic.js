const tap = require('tap')
const create = require('../../src/commands/create')
const sleep = require('await-sleep')

module.exports = (StoreClass, opts = {}) => {
  tap.test(`${StoreClass.name}: add a message`, async function(t) {
    const m = create('hi')
    const store = new StoreClass(opts)
    await store.write(m)
    const stored = await store.get(m.meta.hash)
    t.same(stored, m)
  })

  tap.test(`${StoreClass.name}: delete a message`, async function(t) {
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

  tap.test(
    `${StoreClass.name}: delete multiple messages simultaneously`,
    async function(t) {
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
    }
  )

  tap.test(`${StoreClass.name}: test if a message exists`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    const m1Exists = await store.exists(m1)
    t.true(m1Exists)
    const m2Exists = await store.exists(m2)
    t.false(m2Exists)
  })

  tap.test(
    `${StoreClass.name}: don't write the same message twice`,
    async function(t) {
      const m = create('hi')
      const store = new StoreClass(opts)
      await store.clear()
      await store.write(m)
      const mExists = await store.exists(m)
      t.true(mExists)
      await store.write(m)
      let items = 0
      for await (message of store) {
        items++
      }
      t.equal(items, 1)
    }
  )

  tap.test(`${StoreClass.name}: clear the store`, async function(t) {
    const m1 = create('hi')
    const store = new StoreClass(opts)
    await store.write(m1)
    const m1Exists = await store.exists(m1)
    t.true(m1Exists)
    await store.clear()
    const m1StillExists = await store.exists(m1)
    t.false(m1StillExists)
  })

  tap.test(`${StoreClass.name}: test iterator`, async function(t) {
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
    t.same(hashes.sort(), [m1.meta.hash, m2.meta.hash].sort())
  })

  tap.test(
    `${StoreClass.name}: return null for an expired message`,
    async function(t) {
      const m = create({ body: 'hi', expr: 0 })
      const store = new StoreClass(opts)
      await store.write(m)
      if (opts.checkFrequency) await sleep(opts.checkFrequency * 3)
      const stored = await store.get(m.meta.hash)
      t.notOk(stored, m)
    }
  )

  tap.test(
    `${StoreClass.name}: return null for an expired message from the iterator`,
    async function(t) {
      const m = create({ body: 'hi', expr: 0 })
      const store = new StoreClass(opts)
      await store.clear()
      await store.write(m)
      if (opts.checkFrequency) await sleep(opts.checkFrequency * 3)
      let items = 0
      const hashes = []
      for await (const m of store) {
        items++
      }
      t.equal(items, 0)
    }
  )

  tap.test(`${StoreClass.name}: filter messages`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    const store = new StoreClass(opts)
    await store.write(m1)
    await store.write(m2)
    let items = 0
    for await (const m of store.filter({ body: 'hi' })) {
      items++
    }
    t.equal(items, 1)
  })
}
