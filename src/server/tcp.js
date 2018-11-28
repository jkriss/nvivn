const net = require('net')
const EventEmitter = require('events')

const createServerTransport = (opts = {}) => {
  const debug = require('debug')('nvivn:server:tcp:server')
  if (!opts.server) throw new Error('Must provide server instance')
  const server = opts.server

  const tcpServer = net.createServer(c => {
    // 'connection' listener
    debug('client connected')
    c.setEncoding('utf8')
    c.on('end', () => {
      debug('client disconnected')
    })

    c.on('data', message => {
      debug('got message from client:', message)
      // oh. this needs to be per-client, or transaction, or session or something
      const req = server.handle(JSON.parse(message))
      req.on('data', d => c.write(JSON.stringify(d)))
      req.on('error', err => c.write(JSON.stringify(err)))
      req.on('end', () => {
        debug('got end event, emitting empty line')
        c.write('\n', () => debug('-- empty line written --'))
      })
    })
    // c.write('hello\r\n')
    // c.pipe(c)
  })
  tcpServer.on('error', err => {
    throw err
  })

  const listen = () => {
    return new Promise(resolve => {
      tcpServer.listen(opts.listen, () => {
        resolve({ listen: opts.listen })
      })
    })
  }

  return {
    listen,
    close: tcpServer.close.bind(tcpServer),
  }
}

const createClientTransport = async (opts = {}) => {
  const debug = require('debug')('nvivn:server:tcp:client')
  debug('creating tcp client with opts', opts)

  return new Promise((resolve, reject) => {
    const tcpClient = net.createConnection(opts, () => {
      tcpClient.setEncoding('utf8')
      const request = message => {
        const emitter = new EventEmitter()
        tcpClient.on('data', d => {
          // break this up into lines
          const lines = d.split('\n')
          debug('got lines:', lines)
          for (const line of lines) {
            debug('client received:', line)
            if (line === '') {
              debug('got empty line, emitting end')
              emitter.emit('end')
            } else {
              const m = JSON.parse(line)
              if (m.type === 'error') {
                emitter.emit('error', m.message)
              } else {
                emitter.emit('data', m)
              }
            }
          }
        })
        tcpClient.on('end', () => {
          debug('disconnected from server')
        })
        tcpClient.write(JSON.stringify(message))
        return emitter
      }
      resolve({
        request,
        end: tcpClient.end.bind(tcpClient),
      })
    })
  })
}

module.exports = {
  createClientTransport,
  createServerTransport,
}
