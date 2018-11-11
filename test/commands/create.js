const tap = require('tap')
const { create } = require('../../src/index')

tap.test('create a message from a string', async function(t) {
  const m = create('hi')
  t.equal(m.body, 'hi')
  t.ok(m.meta.hash)
  t.ok(m.t)
})

tap.test('create a message from an object', async function(t) {
  const m = create({ body: 'hi' })
  t.equal(m.body, 'hi')
  t.ok(m.meta.hash)
  t.ok(m.t)
})

tap.test('create a message from an object, favor existing data', async function(
  t
) {
  const m = create({ body: 'hi', t: 5, meta: { hash: 'fakehash' } })
  t.equal(m.body, 'hi')
  t.equal(m.meta.hash, 'fakehash')
  t.equal(m.t, 5)
})
