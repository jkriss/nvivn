const debug = require('debug')('nvivn:hub:cli:node')
const getStdin = require('get-stdin')
const tcpHub = require('./tcp')
const loadPlugins = require('./plugins/load')
const oyaml = require('oyaml')
const fs = require('fs-extra')
const JSON5 = require('json5')

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
  }
  // catch any special case, non-hub commands
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
    // NOTE: these paths are relative to the plugin loader file, currently
    plugins: ['./run', './cli', './http-server'].concat(additionalPlugins),
  })
  const hub = await tcpHub({ settings })
  await wrapFunction(hub)
  debug('-- got hub --')

  hub
    .cli(input)
    .then(result => {
      debug('got result', result)
      if (result !== undefined) {
        console.log(
          Array.isArray(result)
            ? result.map(JSON.stringify).join('\n')
            : JSON.stringify(result)
        )
      }
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
