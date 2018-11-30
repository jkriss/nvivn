// const EventEmitter = require('events')

const createClientTransport = (opts = {}) => {
  const debug = require('debug')('nvivn:server:in-process:client')
  debug('creating in process client with opts', opts)
  if (!opts.server)
    throw new Error('Must provide a server instance in the arguments')
  const server = opts.server
  const request = message => {
    return server.handle(message)
  }
  return {
    request,
    end: () => {},
  }
}

module.exports = createClientTransport
