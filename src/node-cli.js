require('dotenv').config()
const debug = require('debug')('nvivn:nvivn')
const assert = require('assert')
const { loadConfig } = require('../src/util/config')
const { encode } = require('../src/util/encoding')
const { nvivn, parse } = require('../src/cli')
// const getStore = require('../src/util/store-connection')
const tcp = require('./server/tcp')
const setup = require('./util/setup')
const fs = require('fs-extra')
const getStdin = require('get-stdin')
const oyaml = require('oyaml')
const createHttpClient = require('./client/http')
const { sign, create } = require('./index')

const getPassphrase = () => {
  const prompt = require('prompt')
  return new Promise((resolve, reject) => {
    prompt.start()
    prompt.get(
      {
        properties: {
          passphrase: {
            message: 'Choose a strong passphrase',
            hidden: true,
          },
        },
      },
      (err, result) => {
        if (err) return reject(err)
        resolve(result.passphrase)
      }
    )
  })
}

const run = async () => {
  const args = await parse()
  // console.log(args)

  // if it's the server command, do that the normal way
  if (args.server) {
    if (args['--port']) process.env.PORT = args['--port']
    if (args['--socket']) process.env.SOCKET = args['--socket']
    if (args['--custom']) process.env.CUSTOM_LOGIC = args['--custom']
    if (args['--tcp']) require('./server/standalone-tcp')
    else if (args['--https']) require('./server/secure')
    else require('./server/standalone-http')
    return []
  } else {
    let tcpServer, transport
    const socket = '.nvivn.sock'
    let remote = false
    let settings
    // if the socket doesn't already exist, start up a local tcp server that allows everything
    if (!args['--hub']) {
      const exists = await fs.exists(socket)
      if (!exists) {
        debug("socket doesn't exist, starting server")
        const { config, client, server } = await setup()
        // allow everything, this is local only
        server.trustAll = true
        tcpServer = tcp.createServerTransport({
          server,
          listen: socket,
        })
        await tcpServer.listen()

        process.on('SIGINT', function() {
          tcpServer.close()
          process.exit()
        })
      } else {
        debug('socket exists, using server')
      }
      transport = await tcp.createClientTransport({ path: socket })
    } else {
      // TODO create different transports based on protocols
      remote = true
      settings = await loadConfig().then(c => c.data())
      transport = await createHttpClient({ url: args['--hub'] })
    }

    // now run the command

    const cleanup = () => {
      debug('cleaning up')
      if (tcpServer) {
        tcpServer.close()
      }
      process.exit()
    }

    let command = Object.keys(args).find(
      a => a[0].match(/[a-z]/i) && args[a] === true
    )
    const opts = {}
    for (const key of Object.keys(args)) {
      if (
        !key[0].match(/[a-z]/i) &&
        args[key] &&
        (!Array.isArray(args[key]) || args[key].length > 0)
      ) {
        opts[key.replace(/--|[<>]/g, '')] = args[key]
      }
    }
    debug(opts)

    let messages
    debug('raw message:', opts.message, typeof opts.message)
    if (typeof opts.message === 'string' && opts.message.includes('\n')) {
      messages = opts.message
        .trim()
        .split('\n')
        .map(JSON.parse)
      // debug("messages now:", messages)
    } else {
      messages = [opts.message]
    }
    debug('messages', messages)

    for await (const inputMessage of messages) {
      let messageArgs = inputMessage || opts
      debug('messageArgs', messageArgs)
      if (command === 'create') {
        debug('creating with message:', messageArgs)
        let message = Array.isArray(messageArgs) ? messageArgs[0] : messageArgs
        try {
          message = oyaml.parse(messageArgs.join(' '))
        } catch (err) {
          debug('tried to parse', messageArgs)
          try {
            message = JSON.parse(messageArgs)
          } catch (err2) {}
        }
        messageArgs = message
      } else if (command === 'list') {
        messageArgs = oyaml.parse(args['<filter>'].join(' '), {
          unflatten: false,
        })
      } else if (command === 'delete') {
        command = 'del'
      }

      let message = create({ type: 'command', command, args: messageArgs })
      if (remote) message = sign(message, { keys: settings.keys })
      const req = transport.request(message)

      await new Promise(resolve => {
        const buffered = []
        req.on('data', d => {
          debug('got data', d)
          if (command === 'verify') {
            buffered.push(d)
          } else {
            console.log(JSON.stringify(d))
          }
        })
        req.on('error', err => {
          console.error('got error:', err)
          resolve()
        })
        req.on('end', () => {
          req.removeAllListeners()
          if (command === 'verify') {
            debug('checking to see if all things are true', buffered.length)
            const allTrue = buffered.filter(d => d).length === buffered.length
            if (allTrue) console.log(JSON.stringify(inputMessage))
          }
          resolve()
        })
      })
    }
    cleanup()
  }
}

run().catch(console.error)
