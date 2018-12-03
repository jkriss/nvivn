const tap = require('tap')
const { getConfigDb } = require('../src/util/config-db')

tap.test('create a config database', async function(t) {
  const db = await getConfigDb()
  t.ok(db)
})

tap.test('set a value', async function(t) {
  const db = await getConfigDb()
  await db.set({ thing: 'hi' })
  const { thing } = db.data()
  t.same(thing, 'hi')
})

tap.test('set an object value', async function(t) {
  const db = await getConfigDb()
  await db.set({ thing: [1, 'hi', { stuff: 'zorp' }] })
  const { thing } = db.data()
  t.same(thing, [1, 'hi', { stuff: 'zorp' }])
})

tap.test('initialize with a json object', async function(t) {
  const config = {
    peer: [1, 2, 3],
    keys: {
      publicKey: Buffer.from('acdef', 'hex'),
      secretKey: Buffer.from('cafe1', 'hex'),
    },
  }
  const db = await getConfigDb({ data: config })
  const { keys } = await db.data()
  t.same(keys.publicKey, Buffer.from('acdef', 'hex'))
})

tap.test('get new config object on change', function(t) {
  t.plan(1)
  getConfigDb().then(db => {
    db.on('change', config => {
      t.same(config.hi, 'what')
    })
    db.set({ hi: 'what' })
  })
})
