const debug = require('debug')('nvivn:announce')
const assert = require('assert')
const create = require('./create')
const sign = require('./sign')
const { encode, decode } = require('../util/encoding')

const announce = (args = {}, opts = {}) => {
  assert(opts.config, 'Must provide a config object as part of opts')
  const settings = opts.config.data()
  assert(settings.info, 'config must have an info object')
  const connect = args.connect || opts.info.connect
  assert(
    connect,
    `must provide a 'connect' object with connection information in args or in opts.info`
  )
  const publicKey =
    typeof opts.keys.publicKey === 'string'
      ? decode(opts.keys.publicKey)
      : opts.keys.publicKey
  const publicKeyHex = publicKey.toString('hex')
  const body = {
    type: 'announce',
    id: settings.info.id,
    domain: `${publicKeyHex}.nvivn`,
    nodeId: settings.info.nodeId,
    publicKey: encode(publicKey),
    connect,
  }
  // TODO figure out how to get connection information
  if (settings.info.appName) body.appName = settings.info.appName
  const mergedArgs = Object.assign({ expr: 'now+24h' }, args, body)
  const m = create(mergedArgs, opts)
  return sign(m, opts)
}

module.exports = announce
