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
      const handleErr = err => c.write(JSON.stringify(err) + '\n')
      try {
        const req = server.handle(JSON.parse(message))
        let count = 0
        req.on('data', d => {
          debug('data:', JSON.stringify(d))
          c.write(JSON.stringify(d) + '\n')
          debug('tcp server wrote result', ++count)
        })
        req.on('error', handleErr)
        req.on('end', () => {
          debug('got end event, emitting empty line')
          c.write('\n', () => debug('-- empty line written --'))
        })
      } catch (err) {
        handleErr({ type: 'error', message: 'invalid input', statusCode: 400 })
      }
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
        let remainder = ''
        let count = 0
        let lineCount = 0
        let emitCount = 0
        let previousMessage
        tcpClient.on('data', d => {
          const doubleNewline = !!d.match(/\n\n$/)
          debug('-- got data --', ++count, 'has double newline?', doubleNewline)
          // debug("raw input:", JSON.stringify(d))
          // break this up into lines, strip just the last trailing line break
          const lines = `${remainder}${d
            .replace(/^\n/, '')
            .replace(/\n$/, '')}`.split('\n')
          debug(lines.length, 'lines')
          if (doubleNewline) {
            debug('raw data', JSON.stringify(d))
            debug('lines:', lines)
          }
          // const lines = d.replace(/\n$/,'').split('\n')
          remainder = ''
          // debug('got lines:', lines)
          for (const line of lines) {
            debug('line', ++lineCount)
            // debug('client received:', line)
            if (line === '') {
              debug('got empty line, emitting end') //. raw input:', JSON.stringify(d))
              emitter.emit('end')
            } else {
              try {
                const m = JSON.parse(line)
                if (m.type === 'error') {
                  emitter.emit('error', m.message)
                } else {
                  // debug('emitting data', ++emitCount)
                  emitter.emit('data', m)
                  previousMessage = m
                }
              } catch (err) {
                // console.error(`Error parsing line: "${line}"`)
                // this is a partial json bit, save it for next time
                debug('setting remainder to', line)
                // debug("previous message was", previousMessage)
                lineCount--
                remainder = line
              }
            }
          }
          debug('-- done handling data')
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
