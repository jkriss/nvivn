const debug = require('debug')('nvivn:hub:cli:node')
const getStdin = require('get-stdin')
const tcpHub = require('./tcp')
// const cli = require('./plugins/cli')
// const addRun = require('./plugins/run')
const loadPlugins = require('./plugins/load')
const oyaml = require('oyaml')
const fs = require('fs-extra')
const JSON5 = require('json5')

const server = async (hub, opts = {}) => {
  const createHttpServer = require('./http')
  console.log('starting server with opts', opts)
  const { listen } = createHttpServer(hub)
  const port = opts.port || 3000
  await listen(port)
  console.log(`Listening at http://localhost:${port}`)
}

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
  // catch any special case, non-hub commands
  // NOTE: these paths are relative to the plugin loader file, currently
  let additionalPlugins = []
  try {
    additionalPlugins = await fs
      .readFile('./.nvivn.json', 'utf8')
      .then(str => JSON5.parse(str))
      .then(config => config.plugins)
  } catch (err) {
    if (!err.code || err.code !== 'ENOENT') {
      console.error('error loading .nvivn.json', err)
    }
  }
  const { settings, wrapFunction } = await loadPlugins({
    plugins: ['./run', './cli'].concat(additionalPlugins),
  })
  const hub = await tcpHub({ settings })
  await wrapFunction(hub)
  debug('-- got hub --')
  // addRun(cli(hub))
  if (input.match(/^server($|\s)/)) {
    return server(hub, oyaml.parse(input.replace('server', '')))
  }
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
