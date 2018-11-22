const tap = require('tap')
const signatures = require('sodium-signatures')
const { decode } = require('../../src/util/encoding')
const { create, sign } = require('../../src/index')

tap.test('sign a message', async function(t) {
  const m = create('hi')
  const keys = signatures.keyPair()
  const signed = await sign(m, { keys })
  t.ok(signed)
  t.ok(signed.meta)
  t.same(typeof signed.meta.signed[0].publicKey, 'string')
  t.same(keys.publicKey, decode(signed.meta.signed[0].publicKey))
})
