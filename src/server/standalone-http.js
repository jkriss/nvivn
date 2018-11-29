#!/usr/bin/env node
require('dotenv').config()
const debug = require('debug')('nvivn:server:http')
const micro = require('micro')
const { send, json } = require('micro')
const loadKeys = require('../util/load-keys')
const getStore = require('../util/store-connection')
const url = require('url')
const { encode } = require('../util/encoding')
const Client = require('../client/index')
const Server = require('./core')
const MemorySyncStore = require('../client/mem-sync-store')
const loadInfo = require('../util/info')

const cors = require('micro-cors')()
const keys = loadKeys()
const publicKey = encode(keys.publicKey)
const trustedKeys = (process.env.NVIVN_TRUSTED_KEYS || '').trim().split(/\s+/)
const messageStore = getStore(process.env.NVIVN_MESSAGE_STORE, { publicKey })
const syncStore = new MemorySyncStore()
const info = loadInfo()
const client = new Client({ messageStore, keys, syncStore, info })
const server = new Server({ client, trustedKeys })

if (info.greeting) console.log(info.greeting)

const handler = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200)
  const requestUrl = url.parse(req.url)
  if (req.method !== 'POST' || requestUrl.pathname !== '/')
    return send(res, 404)

  const message = await json(req)
  const r = server.handle(message)
  r.on('data', d => res.write(JSON.stringify(d) + '\n'))
  r.on('end', () => {
    res.statusCode = 200
    res.end()
  })
  r.on('error', err => {
    // TODO add http status code equivalents to error messages, and pass them through
    res.statusCode = err.statusCode || 500
    res.write(JSON.stringify(err))
    res.end()
  })
}

module.exports = cors(handler)

if (require.main === module) {
  const port = process.env.PORT || 3000
  const server = micro(module.exports)
  server.listen(port, () =>
    console.log(`Listening at http://localhost:${port}`)
  )
}
