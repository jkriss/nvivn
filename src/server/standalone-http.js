const debug = require('debug')('nvivn:server:http')
const micro = require('micro')
const { send, json } = require('micro')
const url = require('url')
const setup = require('../util/setup')
const createHttpServer = require('./http')

const createHandler = async () => {
  const { config, client, server } = await setup()
  client.startAutoSync()
  const info = await config.get('info')
  if (info && info.greeting) console.log(info.greeting)
  return createHttpServer({ server }).handler
}

const run = async () => {
  const handler = await createHandler()
  const port = process.env.PORT || 3000
  const server = micro(handler)
  server.listen(port, () =>
    console.log(`Listening at http://localhost:${port}`)
  )
}

run()
