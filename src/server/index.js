require('dotenv').config()
const debug = require('debug')('nvivn:server')
const { send, json } = require('micro')
const loadKeys = require('../util/load-keys')
const getStore = require('../util/store-connection')
const url = require('url')
const { post, list, del, verify } = require('../index')
const { encode } = require('../util/encoding')
const querystring = require('querystring')
const NodeCache = require('node-cache')
const promisify = require('util').promisify

const MAX_SIGNATURE_AGE = 30 * 1000 // 30 seconds
const keys = loadKeys()
const publicKey = encode(keys.publicKey)
const messageStore = getStore(process.env.NVIVN_MESSAGE_STORE, { publicKey })
const cache = new NodeCache({
  stdTTL: MAX_SIGNATURE_AGE / 1000,
  checkperiod: MAX_SIGNATURE_AGE / 1000,
})

const setCache = promisify(cache.set).bind(cache)
const getCache = promisify(cache.get).bind(cache)

const isAllowed = (command, userPublicKey, message) => {
  return userPublicKey === publicKey
}

const runCommand = async (command, args) => {
  debug('running command', command, 'with arguments', args)
  const opts = { messageStore, keys }
  let result
  if (command === 'list') {
    result = await list(args, opts)
  } else if (command === 'post') {
    result = await post(args.message, opts)
  } else if (command === 'delete') {
    result = await del(args.hash, Object.assign({}, opts, { hard: args.hard }))
  }
  return result
}

module.exports = async (req, res) => {
  const requestUrl = url.parse(req.url)
  // const path = requestUrl.pathname
  const opts = { messageStore, keys }
  let result
  const q = querystring.parse(requestUrl.query)
  debug('querystring:', q)
  const limit = q.limit || 100
  delete q.limit
  if (req.method === 'GET') {
    // TODO pull this once commands are implemented?
    // this can remain if anonymous reads are allowed
    result = await list(q, opts)
  } else if (req.method === 'POST') {
    const message = await json(req)
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
        return send(res, 401, { message: 'signature is not recent enough' })
      }
      // have we already processed this hash within the acceptable time frame?
      const recentlyRun = await getCache(message.meta.hash)
      if (recentlyRun) {
        return send(res, 401, { message: 'command has already been run' })
      }
      debug('command run by', users)
      const commandAllowed = !users
        .map(u => isAllowed(message.command, u))
        .find(result => result === false)
      debug('command allowed?', commandAllowed)
      if (!commandAllowed) {
        return send(res, 403, {
          message: `not allowed to run ${mesage.command}`,
        })
      } else {
        setCache(message.meta.hash, true)
        result = await runCommand(message.command, message.args)
      }
    }
  } else {
    return send(res, 404)
  }
  debug('result:', result)
  if (typeof result !== 'undefined') {
    const iterableResult =
      result[Symbol.asyncIterator] || result[Symbol.iterator]
        ? result
        : [result]
    let count = 0
    for await (const r of iterableResult) {
      if (limit && count >= limit) {
        break
      }
      const str = typeof r === 'string' ? r : JSON.stringify(r)
      res.write(str + '\n')
      count++
    }
  }
  res.end()
}
