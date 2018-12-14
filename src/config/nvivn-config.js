const debug = require('debug')('nvivn:config:bootstrap')
const currentVersion = require('../../package.json').version
const keys = require('../util/keys')

const bootstrapConfig = async config => {
  return new Promise(resolve => {
    config.on('ready', () => {
      const settings = config.data()
      debug('-- loaded settings', settings)
      config.set(
        'default',
        Object.assign({}, { version: currentVersion }, settings.default)
      )
      if (!settings.nodeId) {
        const nodeId = Math.random()
          .toString(32)
          .slice(2, 8)
        config.set('node', { nodeId })
      }
      if (!settings.keys) {
        debug('no keys, generating')
        config.set('keys', { keys: keys.generate() })
      }
      resolve(config)
    })
  })
}

module.exports = bootstrapConfig
