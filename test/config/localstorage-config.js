const tap = require('tap')
const path = require('path')
const Config = require('../../src/config/localstorage-config')
const fs = require('fs-extra')
const sleep = require('await-sleep')

const LocalStorage = require('node-localstorage').LocalStorage
const localStoragePath = path.join(__dirname, 'files', 'tmp', 'localstorage')
const localStorage = new LocalStorage(localStoragePath)

tap.test('create a new localstorage config', async function(t) {
  const config = new Config({ localStorage })
  fs.removeSync(path.join(localStoragePath, 'stuff'))
  t.ok(config)
  config.set('stuff', { greeting: 'hello!' })
  t.same(config.data().greeting, 'hello!')
  // node-localstorage doesn't write right away, it seems
  await sleep(10)
  t.ok(
    fs.existsSync(path.join(localStoragePath, 'stuff')),
    'local storage file should exist'
  )
})

tap.test('create a new localstorage config', async function(t) {
  fs.removeSync(path.join(localStoragePath, 'bootstrap'))
  localStorage.setItem('bootstrap', JSON.stringify({ greeting: 'hello!' }))
  const config = new Config({
    localStorage,
    layers: [{ name: 'bootstrap' }],
  })
  t.ok(config)
  t.same(config.data().greeting, 'hello!')
})
