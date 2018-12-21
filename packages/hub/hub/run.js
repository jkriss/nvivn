const debug = require('debug')('nvivn:hub:run')
const { verify } = require('@nvivn/core')

const MAX_SIGNATURE_AGE = 30 * 1000 // 30 seconds

const addRun = (hub, opts = {}) => {
  hub.run = async cmd => {
    const settings = hub.config.data()
    debug('hub settings:', settings)
    // has to be a command
    if (cmd.type !== 'command')
      throw new Error(`Must have type of 'command', not ${cmd.type}`)

    // signature has to be valid
    const verified = verify(cmd, { all: true })
    debug('verified?', verified)
    if (!verified)
      throw new Error(`Verification failed, bad (or missing) signature`)

    // can't be too old
    const times = cmd.meta.signed.map(s => s.t)
    const oldestSignatureTime = Math.min(...times)
    if (oldestSignatureTime < Date.now() - MAX_SIGNATURE_AGE) {
      throw new Error(
        `Signature is not recent enough (${Date.now() -
          oldestSignatureTime}ms old)`
      )
    }

    // trusted keys can do anything
    const trustedKeys = [settings.keys.publicKey].concat(
      settings.trustedKeys || []
    )
    debug('trusted keys', trustedKeys)
    const trusted = trustedKeys.includes(cmd.meta.signed[0].publicKey)
    debug('is public key trusted?', trusted)

    // user has to be allowed to do this
    if (!trusted && opts.isAllowed) {
      const publicKey = cmd.meta.signed[0].publicKey
      const allowed = await opts.isAllowed({ message: cmd, config: hub.config })
      if (!allowed) throw new Error('Command not allowed')
    }

    return hub.cli(`${cmd.command} ${JSON.stringify(cmd.args || {})}`)
  }
  return hub
}

module.exports = addRun
