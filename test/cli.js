const tap = require('tap')
const { encode, decode } = require('../src/util/encoding')
const { nvivn } = require('../src/cli')
const { create } = require('../src/index')
const signatures = require('sodium-signatures')

tap.test('create a message from a string with cli', async function(t) {
  const m = await nvivn(['create', 'hi'])
  t.equal(m.body, 'hi')
  t.ok(m.meta.hash)
  t.ok(m.t)
})

tap.test('create a message from an object with cli', async function(t) {
  const m = await nvivn(['create', '{"body":"hi"}'])
  t.equal(m.body, 'hi')
  t.ok(m.meta.hash)
  t.ok(m.t)
})

tap.test(
  'create a message from an object, favor existing data with cli',
  async function(t) {
    const m = await nvivn([
      'create',
      '{"body":"hi", "t":5, "meta": {"hash":"fakehash"} }',
    ])
    t.equal(m.body, 'hi')
    t.equal(m.meta.hash, 'fakehash')
    t.equal(m.t, 5)
  }
)

tap.test('sign a message with cli', async function(t) {
  const m = create('hi')
  const keys = signatures.keyPair()
  process.env.NVIVN_PUBLIC_KEY = encode(keys.publicKey)
  process.env.NVIVN_SECRET_KEY = encode(keys.secretKey)
  // const signed = await sign(m, { keys })
  const signed = await nvivn(['sign', JSON.stringify(m)])
  t.ok(signed)
  t.ok(signed.meta)
  t.same(typeof signed.meta.signed[0].publicKey, 'string')
  t.same(keys.publicKey, decode(signed.meta.signed[0].publicKey))
})
