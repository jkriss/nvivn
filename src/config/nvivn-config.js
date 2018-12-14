const debug = require('debug')('nvivn:config:bootstrap')
const currentVersion = require('../../package.json').version
const keys = require('../util/keys')
const { decode } = require('../util/encoding')

const bootstrapConfig = async config => {
  return new Promise(resolve => {
    config.on('ready', () => {
      let settings = config.data()
      debug('-- loaded settings', settings)
      config.set(
        'default',
        Object.assign({}, { version: currentVersion }, settings.default)
      )
      if (!settings.info || !settings.info.nodeId) {
        const nodeId = Math.random()
          .toString(32)
          .slice(2, 8)
        config.set('node', { info: { nodeId } })
      }

      if (!settings.keys) {
        debug('no keys, generating')
        config.set('keys', { keys: keys.generate() })
      }

      // set full id
      settings = config.data()
      const idParts = [settings.info.nodeId]
      if (settings.info.appName) idParts.push(settings.info.appName)
      idParts.push(decode(settings.keys.publicKey).toString('hex'))
      idParts.push('nvivn')
      const id = idParts.join('.')
      config.set(
        'default',
        Object.assign({}, settings.default, { info: { id } })
      )

      resolve(config)
    })
  })
}

module.exports = bootstrapConfig
