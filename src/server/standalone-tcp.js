#!/usr/bin/env node
require('dotenv').config()
const debug = require('debug')('nvivn:server:standalone:tcp')
const tcp = require('./tcp')
const setup = require('../util/setup')

const run = async () => {
  const { config, client, server } = await setup()
  if (config.info && config.info.greeting) console.log(config.info.greeting)

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
