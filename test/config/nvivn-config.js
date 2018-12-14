const tap = require('tap')
const nvivnConfig = require('../../src/config/nvivn-config')
const Config = require('../../src/config/layered-config')

tap.test(`set the proper defaults for a config object`, async function(t) {
  const config = await nvivnConfig(new Config())
  const currentVersion = require('../../package.json').version
  const settings = config.data()
  t.same(settings.version, currentVersion)
  t.ok(settings.info.nodeId, 'should have a node id')
  t.ok(settings.info.id, 'should have a full id')
  t.ok(settings.keys, 'should have a keys object')
  t.ok(settings.keys.publicKey, 'should have a public key')
})
