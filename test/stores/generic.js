const tap = require('tap')
const create = require('../../src/commands/create')
const sleep = require('await-sleep')

module.exports = (name, createStore) => {
  const store = createStore()

  tap.test(`${name}: add a message`, async function(t) {
    const m = create('hi')
    await store.write(m)
    const stored = await store.get(m.meta.hash)
    t.same(stored, m)
  })

  tap.test(`${name}: nonexistant message doesn't exist`, async function(t) {
    await store.clear()
    const missingExists = await store.exists('nope')
    t.notOk(missingExists)
  })

  tap.test(`${name}: delete a message`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    await store.clear()
    await store.write(m1)
    await store.write(m2)
    const stored = await store.get(m1.meta.hash)
    t.same(stored, m1)
    await store.del(m1.meta.hash)
    const stored1 = await store.get(m1.meta.hash)
    t.notOk(stored1)
    const stored1Exists = await store.exists(m1.meta.hash)
    console.log('stored 1 exists?', stored1Exists)
    t.notOk(stored1Exists)
    const stored2 = await store.get(m2.meta.hash)
    t.ok(stored2)
    t.same(m2, stored2)
  })

  tap.test(`${name}: delete multiple messages simultaneously`, async function(
    t
  ) {
    const m1 = create('hi')
    const m2 = create('hi again')
    await store.write(m1)
    await store.write(m2)
    await Promise.all([store.del(m1.meta.hash), store.del(m2.meta.hash)])
    const stored1 = await store.get(m1.meta.hash)
    t.notOk(stored1)
    const stored2 = await store.get(m2.meta.hash)
    t.notOk(stored2)
  })

  tap.test(`${name}: test if a message exists`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    await store.write(m1)
    const m1Exists = await store.exists(m1.meta.hash)
    t.true(m1Exists)
    const m2Exists = await store.exists(m2.meta.hash)
    t.false(m2Exists)
  })

  tap.test(`${name}: don't write the same message twice`, async function(t) {
    await store.clear()
    const m = create('hi')
    console.log('--- message hash:', m.meta.hash)
    await store.write(m)
    const mExists = await store.exists(m.meta.hash)
    t.true(mExists)
    await store.write(m)
    let items = 0
    for await (message of store) {
      console.log('--- read hash', message.meta.hash)
      items++
    }
    t.equal(items, 1)
  })

  tap.test(`${name}: clear the store`, async function(t) {
    const m1 = create('hi')
    await store.write(m1)
    const m1Exists = await store.exists(m1.meta.hash)
    t.true(m1Exists)
    await store.clear()
    const m1StillExists = await store.exists(m1.meta.hash)
    t.false(m1StillExists)
  })

  tap.test(`${name}: test iterator`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    await store.clear()
    await store.write(m1)
    await store.write(m2)
    let items = 0
    const hashes = []
    for await (const m of store) {
      items++
      hashes.push(m.meta.hash)
    }
    t.equal(items, 2)
    t.same(hashes.sort(), [m1.meta.hash, m2.meta.hash].sort())
  })

  // tap.test(`${name}: test iterator, return newest first`, async function(t) {
  //   await store.clear()
  //   const hashes = []
  //   for (let i=0; i<10; i++) {
  //     const m = create(`hi ${i}`)
  //     await store.write(m)
  //     hashes.push(m.meta.hash)
  //   }
  //   const returnedHashes = []
  //   for await (const m of store) {
  //     returnedHashes.push(m.meta.hash)
  //   }
  //   t.same(returnedHashes, hashes.reverse())
  // })

  tap.test(`${name}: return null for an expired message`, async function(t) {
    const m = create({ body: 'hi', expr: 0 })
    await store.write(m)
    if (store.checkFrequency) await sleep(store.checkFrequency * 3)
    const stored = await store.get(m.meta.hash)
    t.notOk(stored, m)
  })

  tap.test(
    `${name}: return null for an expired message from the iterator`,
    async function(t) {
      const m = create({ body: 'hi', expr: 0 })
      await store.clear()
      await store.write(m)
      if (store.checkFrequency) await sleep(store.checkFrequency * 3)
      let items = 0
      const hashes = []
      for await (const m of store) {
        items++
      }
      t.equal(items, 0)
    }
  )

  tap.test(`${name}: filter messages`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    await store.clear()
    await store.write(m1)
    await store.write(m2)
    let items = 0
    for await (const m of store.filter({ body: 'hi' })) {
      items++
    }
    t.equal(items, 1)
  })

  tap.test(`${name}: limit results`, async function(t) {
    const m1 = create('hi')
    const m2 = create('hi again')
    await store.clear()
    await store.write(m1)
    await store.write(m2)
    let items = 0
    for await (const m of store.filter({ $limit: 1 })) {
      items++
    }
    t.equal(items, 1)
  })
}
