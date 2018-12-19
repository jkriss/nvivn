const debug = require('debug')('nvivn:hub')
const commands = require('../index')
const getStore = require('../util/store-connection')

// make them all async for easier handling
const mappedCommands = Object.assign({}, commands, {
  create: async m => commands.create(m),
  verify: async m => {
    if (commands.verify(m, { all: true })) return m
  },
  sign: async (...args) => commands.sign(...args),
  list: async (q, opts) => {
    const results = commands.list(q, opts)
    if (typeof results === 'undefined') return []
    const allResults = []
    for await (const r of results) {
      allResults.push(r)
    }
    return allResults
  },
})

class Hub {
  constructor(config) {
    // debug('creating hub with config:', config)
    this.config = config
    const settings = config.data()
    debug('settings:', settings)
    const messageStore = getStore(settings.messageStore)
    // debug("message store:", messageStore)
    for (const m of Object.keys(mappedCommands)) {
      this[m] = args => {
        debug('calling', m, 'with', args)
        const settings = this.config.data()
        return mappedCommands[m](args, {
          messageStore,
          keys: settings.keys,
          config: this.config,
          info: settings.info,
        }).catch(err => {
          throw { code: 500, message: err.message }
        })
      }
    }
  }
  close() {
    debug('closing')
    if (this.config.close) {
      this.config.close()
    }
  }
}

module.exports = Hub
