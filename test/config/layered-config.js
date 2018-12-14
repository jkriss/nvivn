const tap = require('tap')
const Config = require('../../src/config/layered-config')

tap.test('add to an empty config', async function(t) {
  const config = new Config()
  config.set('stuff', { greeting: 'hello!' })
  t.same(config.data().greeting, 'hello!')
})

tap.test('get a ready event', function(t) {
  t.plan(1)
  const config = new Config()
  config.on('ready', () => {
    t.ok(true, 'ready event got called')
  })
})

tap.test('initialize a layered config', async function(t) {
  const config = new Config({
    layers: [{ name: 'default', data: { greeting: 'hello!' } }],
  })
  t.ok(config)
  t.same(config.data().greeting, 'hello!')
})

tap.test(`don't overwrite an immutable layer`, async function(t) {
  const config = new Config({
    layers: [
      { name: 'default', data: { greeting: 'hello!' }, immutable: true },
    ],
  })
  t.ok(config)
  try {
    config.set('default', { greeting: 'hi' })
  } catch (err) {
    t.ok(err, `should throw an error since it's immutable`)
  }
  t.same(config.data().greeting, 'hello!')
})

tap.test(`allow force overwriting of an immutable layer`, async function(t) {
  const config = new Config({
    layers: [
      { name: 'default', data: { greeting: 'hello!' }, immutable: true },
    ],
  })
  t.ok(config)
  config.set('default', { greeting: 'hi' }, { force: true })
  t.same(config.data().greeting, 'hi')
})

tap.test('top layer wins', async function(t) {
  const config = new Config({
    layers: [{ name: 'default', data: { greeting: 'hello!' } }],
  })
  config.set('overrides', { greeting: 'hey' })
  t.same(config.data().greeting, 'hey')
  t.same(
    config.data('default').greeting,
    'hello!',
    'lower layer should still be available'
  )
})

tap.test('get notified when the data changes', function(t) {
  t.plan(4)
  const config = new Config()
  t.notOk(config.data().greeting)
  config.on('change', layerName => {
    t.same(layerName, 'stuff')
    t.same(config.data().greeting, 'hello!')
  })
  config.on('stuff:change', () => {
    t.same(config.data().greeting, 'hello!')
  })
  config.set('stuff', { greeting: 'hello!' })
})

tap.test(`don't get notified if the change is silent`, function(t) {
  t.plan(1)
  const config = new Config()
  t.notOk(config.data().greeting)
  config.on('change', layerName => {
    // this should never get called
    t.same(layerName, 'stuff')
  })
  config.set('stuff', { greeting: 'hello!' }, { silent: true })
})
