const debug = require('debug')(`nvivn:hub:tcp:${process.pid}`)
const jayson = require('jayson/promise')
const { setup, loadConfig } = require('./node')
const fs = require('fs-extra')
const commands = require('@nvivn/core')
const lockfile = require('lockfile')
const { promisify } = require('util')
const lock = promisify(lockfile.lock)
const unlock = promisify(lockfile.unlock)
const onExit = require('signal-exit')

const SOCKET_PATH = '.nvivn.sock'
const LOCK_PATH = '.nvivn.lock'

const methodNames = Object.keys(commands)

const createServer = async ({ settings, filepath } = {}) => {
  debug('waiting for lock file', LOCK_PATH)
  await lock(LOCK_PATH, { wait: 10 })
  debug('got lock, creating tcp server')
  const hub = await setup({ settings, filepath })
  const methods = {}
  for (const m of methodNames) {
    methods[m] = args => {
      debug('calling hub', m, 'with args', args)
      return hub[m](args)
    }
  }
  const server = jayson.server(methods)
  server.close = () => {
    debug('closing hub')
    hub.close()
    debug('removing lock file')
    // fs.removeSync(LOCK_PATH)
    unlock(LOCK_PATH)
    debug('socket still present?', fs.existsSync(SOCKET_PATH))
  }
  onExit(() => {
    debug('process exiting, cleaning up')
    server.close(() => {
      debug('server closed')
      const stillExists = fs.existsSync(SOCKET_PATH)
      debug('post server close socket still present?', stillExists)
    })
  })
  return server
}

const createClient = async ({ settings, filepath }) => {
  // might need to wait a bit until this is available
  const client = jayson.client.tcp(SOCKET_PATH)
  while (!client && tries < 10) await setup()
  for (const m of methodNames) {
    client[m] = (args = {}) => {
      debug('client calling', m, 'with args', args)
      return client
        .request(m, args)
        .then(res => {
          debug('got response', res)
          if (res.error) throw new Error(res.error.message)
          return res.result
        })
        .catch(async err => {
          debug('error with client request:', err)
          throw err
        })
    }
  }

  onExit(() => {
    debug('process exiting, cleaning up client')
    client.close()
  })

  return client
}

const tcpHub = async ({ settings, filepath } = {}) => {
  let server, listener

  try {
    server = await createServer({ settings, filepath })
    debug('creating tcp server')
    listener = server.tcp().listen(SOCKET_PATH)
    server.on('listening', () => {
      debug('listening at', SOCKET_PATH)
    })
    server.on('error', err => {
      if (err.code !== 'EADDRINUSE') {
        console.error(`couldn't listen:`, err)
      }
    })
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
  const client = await createClient({ settings, filepath })
  client.config = await loadConfig({ settings, filepath, watch: false })

  client.close = () => {
    debug('closing client')
    if (listener) {
      debug('closing listener')
      listener.close()
      listener.on('close', () => {
        debug('listener finally closed, closing server')
        if (server) {
          debug('closing server')
          server.close()
        }
      })
    }
  }
  return client
}

module.exports = tcpHub

if (require.main === module) {
  const test = async () => {
    const hub1 = await tcpHub()
    const hub2 = await tcpHub()
    const info1 = await hub1.info()
    console.log('\ninfo1:', info1)
    const info2 = await hub2.info()
    console.log('\n\ninfo2:', info2, '\n')
    hub1.close()
    hub2.close()
  }
  test()
}
