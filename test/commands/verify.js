const tap = require('tap')
const signatures = require('sodium-signatures')
const { create, sign, verify } = require('../../src/index')

tap.test('sign a message and verify', async function(t) {
  const m = create('hi')
  const keys = signatures.keyPair()
  const signed = await sign(m, { keys })
  t.ok(signed)
  t.ok(signed.meta)
  t.same(verify(m), [true])
})

tap.test('fail if the message is tampered with', async function(t) {
  const m = create('hi')
  const keys = signatures.keyPair()
  const signed = await sign(m, { keys })
  t.ok(signed)
  t.ok(signed.meta)
  m.body = 'new message'
  t.same(verify(m), [false])
})

tap.test('fail if the signature is bad', async function(t) {
  const m = create('hi')
  const keys = signatures.keyPair()
  const signed = await sign(m, { keys })
  t.ok(signed)
  t.ok(signed.meta)
  m.meta.signed[0].signature =
    'hsRspoTUim4igk+DplG4qiGwPpd6AGjaBmT36JcCY8zfON1dLcl4BDTSN6whA3NBt260SzUMqA+gowVb6QvCDQ=='
  t.same(verify(m), [false])
  m.meta.signed[0].signature = 'nope'
  t.same(verify(m), [false])
})
