#!/usr/bin/env node
require('dotenv').config()
const debug = require('debug')('nvivn:server:standalone:tcp')
const loadKeys = require('../util/load-keys')
const getStore = require('../util/store-connection')
const { encode } = require('../util/encoding')
const Client = require('../client/index')
const Server = require('./core')
const MemorySyncStore = require('../client/mem-sync-store')
const tcp = require('./tcp')
const loadInfo = require('../util/info')

const run = async () => {
  const info = loadInfo()
  if (info.greeting) console.log(info.greeting)
  const keys = loadKeys()
  const publicKey = encode(keys.publicKey)
  const trustedKeys = (process.env.NVIVN_TRUSTED_KEYS || '').trim().split(/\s+/)
  const messageStore = getStore(process.env.NVIVN_MESSAGE_STORE, { publicKey })
  const syncStore = new MemorySyncStore()
  const client = new Client({ messageStore, keys, syncStore, info })
  const server = new Server({ client, trustedKeys })
  const port = process.env.PORT || 4444
  const socket = process.env.SOCKET

  const tcpServer = tcp.createServerTransport({
    server,
    listen: socket || port,
  })
  await tcpServer.listen()
  console.log(
    `TCP server listening at ${socket ? socket : `localhost:${port}`}`
  )

  process.on('SIGINT', function() {
    tcpServer.close()
    process.exit()
  })
}

run()
