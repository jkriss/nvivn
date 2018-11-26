const tap = require('tap')
const levelup = require('levelup')
const memdown = require('memdown')
const sub = require('subleveldown')
const streamIterator = require('../src/util/stream-iterator')

const clearDb = async db => {
  const ops = []
  const keys = streamIterator(db.createKeyStream())
  for await (const k of keys) {
    ops.push({ type: 'del', key: k })
  }
  await db.batch(ops)
}

tap.test(`sublevel behavior`, async function(t) {
  const db = levelup(memdown())
  const main = sub(db, 'main', { valueEncoding: 'json' })
  const hashes = sub(db, 'hashes')

  try {
    await hashes.get('nope')
  } catch (err) {
    t.ok(err)
  }

  await main.put('a', { message: 'hi' })
  await main.put('b', { message: 'hi again' })
  const m1 = await main.get('a')

  const keys = streamIterator(main.createKeyStream())

  let count = 0
  for await (let k of keys) {
    count++
  }
  t.same(2, count)

  t.same(m1, { message: 'hi' })
  await main.del('a')
  try {
    const m1PostDelete = await main.get('a')
  } catch (err) {
    t.ok(err)
  }

  await hashes.put('a', 'abcdef')
  const h1 = await hashes.get('a')
  t.same(h1, 'abcdef')
  await hashes.del('a')
  try {
    const h1PostDelete = await hahes.get('a')
  } catch (err) {
    t.ok(err)
  }

  for (let i = 0; i < 10; i++) {
    await main.put('m' + i, { message: 'hi' })
  }

  await clearDb(main)
  count = 0
  for await (let k of keys) {
    count++
  }
  t.same(0, count)
})
