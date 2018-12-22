const debug = require('debug')('nvivn:plugins:load')
const merge = require('merge')

const expand = plugin => {
  if (typeof plugin === 'string') {
    return {
      name: plugin,
      opts: {},
    }
  } else {
    return plugin
  }
}

const instantiate = plugin => {
  return require(plugin.name)(plugin.opts)
}

const loadPlugins = async ({ plugins = [] }) => {
  const wrapFunctions = []
  let settings = {}
  for (const plugin of plugins) {
    debug('loading', plugin)
    let p = instantiate(expand(plugin))
    debug('instantiated plugin', p)
    if (p.setup) wrapFunctions.push(p.setup)
    if (p.settings) {
      let pluginSettings = {}
      if (typeof p.settings === 'function') pluginSettings = await p.settings()
      else if (typeof p.settings === object) pluginSettings = p.settings
      merge.recursive(settings, pluginSettings)
    }
    if (p.isAllowed) {
      // TODO chain these
    }
  }
  debug('settings from plugins', settings)
  wrapFunction = async hub => {
    for (const fn of wrapFunctions) {
      await fn(hub)
    }
    return hub
  }
  return {
    settings,
    wrapFunction,
  }
}

module.exports = loadPlugins
