require('dotenv').config()
const debug = require('debug')('nvivn:server:standalone:tcp')
const path = require('path')
const tcp = require('./tcp')
const setup = require('../util/setup')

const run = async () => {
  const { config, client, server } = await setup()
  if (config.info && config.info.greeting) console.log(config.info.greeting)

  const port = process.env.PORT
  const socket = process.env.SOCKET || '.nvivn.sock'
  if (socket) server.trustAll = true

  let customLogic
  if (process.env.CUSTOM_LOGIC) {
    try {
      customLogic = require(process.env.CUSTOM_LOGIC)
    } catch (err) {
      customLogic = require(path.join(process.cwd(), process.env.CUSTOM_LOGIC))
    }
    server.setCustomLogic(customLogic)
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
