const tap = require('tap')
const yamlConfig = require('../../src/util/yaml-config')

tap.test(`read a front matter yaml file`, async function(t) {
  const configString = `---
version: 1
---
helloooooooo
`
  const config = yamlConfig(configString)
  t.same(config.version, 1)
  t.same(config.info.greeting, 'helloooooooo\n')
})

tap.test(`read a plain yaml file`, async function(t) {
  const configString = `version: 1`
  const config = yamlConfig(configString)
  t.same(config.version, 1)
})
