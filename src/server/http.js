const http = require('http')
const EventEmitter = require('events')
const url = require('url')
const cors = require('micro-cors')()
const { send, json } = require('micro')

const createServerTransport = (opts = {}) => {
  if (!opts.server) throw new Error('Must provide server instance')
  const server = opts.server

  const handler = cors(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 200)
    const requestUrl = url.parse(req.url)
    if (req.method !== 'POST' || requestUrl.pathname !== '/')
      return send(res, 404)

    const message = await json(req, { limit: '10mb' })
    const r = server.handle(message)
    res.setHeader('Content-Type', 'application/json')
    r.on('data', d => res.write(JSON.stringify(d) + '\n'))
    r.on('end', () => {
      res.statusCode = 200
      res.end()
    })
    r.on('error', err => {
      // TODO add http status code equivalents to error messages, and pass them through
      return send(res, err.statusCode || 500, err)
    })
  })
  const httpServer = http.createServer(handler)

  const listen = port => {
    return new Promise(resolve => {
      httpServer.listen(port, () => resolve({ port }))
    })
  }
  const close = () => {
    return new Promise(resolve => {
      httpServer.close(() => resolve())
    })
  }
  return {
    handler,
    listen,
    close,
  }
}

module.exports = createServerTransport
