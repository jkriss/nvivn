const tap = require('tap')
const generate = require('../index')

tap.test(
  'generate a stable key pair for the same username and password',
  async function(t) {
    const keys = await generate('someuser', 'some sufficiently long passphrase')
    t.ok(keys.publicKey)
    t.ok(keys.secretKey)
    const k2 = await generate('someuser', 'some sufficiently long passphrase')
    t.ok(k2.publicKey)
    t.ok(k2.secretKey)
    t.same(keys.publicKey, k2.publicKey)
    t.same(keys.secretKey, k2.secretKey)
  }
)
