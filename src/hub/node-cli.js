const debug = require('debug')(`nvivn:hub:cli:node:${process.pid}`)
const getStdin = require('get-stdin')
const tcpHub = require('./tcp')
const cli = require('./cli')
const addRun = require('./run')
const oyaml = require('oyaml')

const run = async () => {
  debug('-- starting cli run --')
  let input = process.argv.slice(2).join(' ')
  if (input.match(/-$/)) {
    debug('reading stdin')
    const stdin = await getStdin()
    debug('got stdin', JSON.stringify(stdin))
    if (stdin === '')
      throw new Error('"-" option specified, but no input found')
    input = input.replace(/-$/, oyaml.stringify(JSON.parse(stdin)))
    // TODO merge in other options if provide
  }
  const hub = await tcpHub()
  debug('-- got hub --')
  addRun(cli(hub))
  hub
    .cli(input)
    .then(result => {
      debug('got result', result)
      console.log(
        Array.isArray(result)
          ? result.map(JSON.stringify).join('\n')
          : JSON.stringify(result)
      )
    })
    .catch(err => {
      console.error('cli error:', err)
    })
    .finally(() => {
      debug('done, closing hub')
      hub.close()
    })
}

run().catch(console.error)
