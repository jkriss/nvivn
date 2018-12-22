const debug = require('debug')('nvivn:plugins:cli')
const oyaml = require('oyaml')

const addCli = () => {
  const setup = hub => {
    debug('adding cli method')
    hub.cli = async str => {
      const [command, ...rest] = str.split(/\s+/)
      const args = rest.join(' ').trim()
      debug('calling command', command, 'with args', rest.join(' '))
      let opts = {}
      if (args.length > 0) {
        if (!args.includes(':')) {
          opts = { body: args }
        } else {
          try {
            opts = oyaml.parse(args, { unflatten: false })
          } catch (err) {
            opts = JSON.parse(args)
          }
        }
      }
      debug('normalized arguments', opts)
      if (!hub[command]) throw new Error(`No command "${command}"`)
      return hub[command](opts)
    }
    debug('cli now:', hub.cli)
    return hub
  }
  return {
    setup,
  }
}

module.exports = addCli
