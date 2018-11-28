const debug = require('debug')('nvivn:server:core')
const { verify } = require('../index')
const { encode } = require('../util/encoding')
const NodeCache = require('node-cache')
const MAX_SIGNATURE_AGE = 30 * 1000 // 30 seconds
const { promisify } = require('es6-promisify')
const EventEmitter = require('events')

class Server {
  constructor(opts = {}) {
    const ee = new EventEmitter()
    this.on = ee.on.bind(ee)
    this.emit = ee.emit.bind(ee)
    if (!opts.client) throw new Error('Must provide client object')
    this.client = opts.client
    this.publicKey = opts.client.getPublicKey()
    const maxSignatureAge = opts.maxSignatureAge || MAX_SIGNATURE_AGE
    const cache = new NodeCache({
      stdTTL: maxSignatureAge / 1000,
      checkperiod: maxSignatureAge / 1000,
    })
    this.setCache = promisify(cache.set).bind(cache)
    this.getCache = promisify(cache.get).bind(cache)
    this.trustedKeys = opts.trustedKeys || []
  }
  async getTrustedKeys() {
    const keys = [this.publicKey].concat(this.trustedKeys)
    return keys.map(k => (typeof k === 'string' ? k : encode(k)))
  }
  async isAllowed({ command, userPublicKey, message }) {
    const trustedKeys = await this.getTrustedKeys()
    debug(
      'looking for',
      userPublicKey,
      'in',
      trustedKeys,
      trustedKeys.includes(userPublicKey)
    )
    return trustedKeys.includes(userPublicKey)
  }
  async handle(message) {
    debug('handling', message)
    let result
    const error = message => {
      this.emit('error', { type: 'error', message })
      this.emit('end')
    }
    if (message.type === 'command') {
      debug('handling command', message.command)
      const verificationResult = await verify(message)
      // all signatures must pass for this to count
      const verified =
        message.meta.signed && !verificationResult.find(v => v === false)
      if (!verified) return send(res, 400, { message: 'signature not valid' })
      debug('verified command')
      const users = message.meta.signed.map(s => s.publicKey)
      // are the signatures recent enough?
      const times = message.meta.signed.map(s => s.t)
      const oldestSignatureTime = Math.min(...times)
      if (oldestSignatureTime < Date.now() - MAX_SIGNATURE_AGE) {
        return error('signature is not recent enough')
      }
      // have we already processed this hash within the acceptable time frame?
      const recentlyRun = await this.getCache(message.meta.hash)
      if (recentlyRun) {
        return error('command has already been run')
      }
      debug('command run by', users)
      // const trueResults = users
      //   .map(u => this.isAllowed({ command: message.command, userPublicKey: u, message }))
      //   .filter(result => result === true)
      const trueResults = []
      for await (const u of users) {
        const allowed = await this.isAllowed({
          command: message.command,
          userPublicKey: u,
          message,
        })
        if (allowed) trueResults.push(true)
      }
      debug('trueResults:', trueResults, 'users length', users.length)
      const commandAllowed = trueResults.length === users.length
      debug('command allowed?', commandAllowed)
      if (!commandAllowed) {
        return error(`not allowed to run ${message.command}`)
      } else {
        this.setCache(message.meta.hash, true)
        result = await this.client.run(message.command, message.args)
      }
    } else {
      return error(`input ${JSON.stringify(message)} was not of type "command"`)
    }

    const iterableResult =
      typeof result !== 'string' &&
      (result[Symbol.asyncIterator] || result[Symbol.iterator])
        ? result
        : [result]
    for await (const r of iterableResult) {
      debug('got iterated result', r)
      this.emit('data', r)
    }
    this.emit('end')
  }
}

module.exports = Server
