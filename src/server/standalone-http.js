const debug = require('debug')('nvivn:server:http')
const micro = require('micro')
const { send, json } = require('micro')
const url = require('url')
const setup = require('../util/setup')
const createHttpServer = require('./http')
const internalIp = require('internal-ip')

const port = process.env.PORT || 3000

const createHandler = async () => {
  const { config, client, server } = await setup()
  const ip = await internalIp.v4()
  config.set({ info: { connect: { url: `http://${ip}:${port}` } } })
  client.startAutoSync()
  const { info } = config.data()
  if (info && info.greeting) console.log(info.greeting)
  client.startAnnouncing()
  // client.startAnnouncing({ interval: 15 * 1000 })
  return {
    settings: config.data(),
    handler: createHttpServer({ server }).handler,
  }
}

const run = async () => {
  const { handler, settings } = await createHandler()
  const server = micro(handler)
  server.listen(port, () =>
    console.log(`Listening at ${settings.info.connect.url}`)
  )
}

run()
