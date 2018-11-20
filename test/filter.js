const tap = require('tap')
const filter = require('../src/util/filter')

tap.test('filter message objects', async function(t) {
  const messages = [{ body: 'hi' }, { body: 'there' }]
  const onlyHi = filter({ body: 'hi' })
  t.equal(messages.filter(onlyHi).length, 1)
})

tap.test('special handling of since', async function(t) {
  const messages = [{ body: 'hi', t: 0 }, { body: 'there', t: Date.now() }]
  const onlyRecent = filter({ since: 'now-10m' })
  t.equal(messages.filter(onlyRecent).length, 1)
  const onlyFuture = filter({ since: 'now+10m' })
  t.equal(messages.filter(onlyFuture).length, 0)
})
