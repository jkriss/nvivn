const debug = require('debug')('nvivn:hub:cli')
const oyaml = require('oyaml')

const addCli = hub => {
  hub.cli = async str => {
    const [command, ...rest] = str.split(/\s+/)
    const args = rest.join(' ').trim()
    debug('calling command', command, 'with args', rest.join(' '))
    let opts
    if (!args.includes(':')) {
      opts = { body: args }
    } else {
      try {
        opts = oyaml.parse(args, { unflatten: false })
      } catch (err) {
        opts = JSON.parse(args)
      }
    }
    if (!hub[command]) throw new Error(`No command "${command}"`)
    return hub[command](opts)
  }
}

module.exports = addCli

if (require.main === module) {
  const createHub = require('./node')
  const args = process.argv.slice(2).join(' ')
  const input = args.length > 0 ? args : 'create body:hi type:test'
  createHub().then(hub => {
    addCli(hub)
    hub
      .cli(input)
      .then(console.log)
      .catch(console.error)
      .finally(hub.close())
  })
}
