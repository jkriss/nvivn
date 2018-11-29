#!/usr/bin/env node
require('dotenv').config()
const debug = require('debug')('nvivn:server:http')
const micro = require('micro')
const { send, json } = require('micro')
const url = require('url')
const setup = require('../util/setup')

const createHandler = async () => {
  const cors = require('micro-cors')()
  const { config, client, server } = await setup()

  if (config.info && config.info.greeting) console.log(config.info.greeting)

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
  return cors(handler)
}

module.exports = createHandler

if (require.main === module) {
  ;(async function() {
    const handler = await createHandler()
    const port = process.env.PORT || 3000
    const server = micro(module.exports)
    server.listen(port, () =>
      console.log(`Listening at http://localhost:${port}`)
    )
  })()
}
