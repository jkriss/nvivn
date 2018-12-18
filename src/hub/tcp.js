const debug = require('debug')('nvivn:hub:tcp')
const jayson = require('jayson/promise')
const createHub = require('./node')
const fs = require('fs-extra')
const commands = require('../index')

const SOCKET_PATH = '.nvivn.sock'
const LOCK_PATH = '.nvivn.lock'

const methodNames = Object.keys(commands)

const createServer = async ({ settings, filepath } = {}) => {
  const locked = fs.existsSync(LOCK_PATH)
  if (locked) throw new Error(`${LOCK_PATH} already exists`)
  fs.writeFileSync(LOCK_PATH, '')
  const hub = await createHub({ settings, filepath })
  // console.log("hub:", hub)
  const methods = {}
  for (const m of methodNames) {
    methods[m] = args => {
      debug('calling hub', m, 'with args', args)
      return hub[m](args)
    }
  }
  const server = jayson.server(methods)
  server.close = () => {
    hub.close()
    fs.removeSync(LOCK_PATH)
  }
  return server
}

const createClient = () => {
  const client = jayson.client.tcp(SOCKET_PATH)
  for (const m of methodNames) {
    client[m] = (...args) => {
      debug('client calling', m, 'with args', args)
      return client.request(m, args).then(res => res.result)
    }
  }
  return client
}

const tcpHub = async ({ settings, filepath } = {}) => {
  let server, listener

  try {
    server = await createServer({ settings, filepath })
    listener = server
      .tcp()
      .listen(SOCKET_PATH)
      .on('error', err => {
        // if (err.code !== 'EADDRINUSE') {
        console.error('ooops', err)
        // }
      })
  } catch (err) {
    // console.error("error:", err, err.code)
  }
  const client = createClient()
  client.close = () => {
    if (server) server.close()
    if (listener) listener.close()
  }
  return client
}

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
