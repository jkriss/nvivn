const debug = require('debug')('nvivn:hub:browser')
const Hub = require('./common')
const LocalstorageConfig = require('../config/localstorage-config')
const nvivnConfig = require('../config/nvivn-config')

const loadConfig = async ({ settings = {}, prefix, localStorage }) => {
  const defaults = {
    messageStore: 'leveljs:nvivn',
  }
  debug('settings:', settings)
  const config = new LocalstorageConfig({
    localStorage,
    prefix,
    layers: [
      {
        name: 'default',
        data: Object.assign(defaults, settings),
        write: false,
      },
      { name: 'keys', data: settings.keys || {} },
      { name: 'settings', data: settings },
      { name: 'node' },
    ],
  })
  return nvivnConfig(config)
}

const setup = async ({ settings, prefix, localStorage } = {}) => {
  const config = await loadConfig({ settings, prefix, localStorage })
  return new Hub(config)
}

module.exports = setup
