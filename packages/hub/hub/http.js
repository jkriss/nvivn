const debug = require('debug')('nvivn:hub:http')
const http = require('http')
const url = require('url')
const cors = require('micro-cors')()
const { send, json } = require('micro')

const createServer = hub => {
  const handler = cors(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 200)
    const requestUrl = url.parse(req.url)
    if (req.method !== 'POST' || requestUrl.pathname !== '/')
      return send(res, 404)

    const message = await json(req, { limit: '10mb' })
    res.setHeader('Content-Type', 'application/json')

    try {
      const result = await hub.run(message)
      debug('result:', result)
      const lines = Array.isArray(result) ? result : [result]
      debug('lines:', lines)
      send(res, 200, lines.map(line => JSON.stringify(line) + '\n').join(''))
    } catch (err) {
      console.error(err)
      send(res, 500, { error: err.message })
    }
  })

  const httpServer = http.createServer(handler)

  const listen = port => {
    return new Promise(resolve => {
      httpServer.listen(port, () => {
        debug('http server listening on port', port)
        resolve({ port })
      })
    })
  }

  return {
    handler,
    listen,
  }
}

module.exports = createServer
