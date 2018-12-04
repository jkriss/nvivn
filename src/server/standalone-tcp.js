require('dotenv').config()
const debug = require('debug')('nvivn:server:standalone:tcp')
const tcp = require('./tcp')
const setup = require('../util/setup')

const run = async () => {
  const { config, client, server } = await setup()
  if (config.info && config.info.greeting) console.log(config.info.greeting)

  const port = process.env.PORT
  const socket = process.env.SOCKET || '.nvivn.sock'
  if (socket) {
    server.trustAll = true
  }

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
