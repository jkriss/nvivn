const process = require('process')
const oyaml = require('oyaml')
const getStdin = require('get-stdin')
const fetch = require('node-fetch')

const debug = (...args) => {
  if (process.env.DEBUG) console.error(...args)
}

let keys
if (!process.env.NVIVN_PUBLIC_KEY) {
  const fs = require('fs')
  keys = JSON.parse(fs.readFileSync('.nvivn/keys', 'utf8')).keys
} else {
  keys = {
    publicKey: process.env.NVIVN_PUBLIC_KEY,
    secretKey: process.env.NVIVN_SECRET_KEY,
  }
}
const Client = require('./index')

const run = async () => {
  const client = new Client({ keys, fetch })

  debug('keys:', keys)
  let input = process.argv.slice(2).join(' ')
  if (input.match(/-$/)) {
    const stdin = await getStdin()
    if (stdin === '')
      throw new Error('"-" option specified, but no input found')
    input = input.replace(/-$/, oyaml.stringify(JSON.parse(stdin)))
  }

  const [command, ...rest] = input.split(/\s+/)
  const args = rest.join(' ').trim()
  debug('args:', args)

  let opts = {}
  if (args.length > 0) {
    if (!args.includes(':')) {
      opts = { body: args }
    } else {
      try {
        opts = oyaml.parse(args, { unflatten: false })
        debug('opts now:', opts)
      } catch (err) {
        opts = JSON.parse(args)
      }
    }
  }

  let result
  let hub = process.env.HUB || opts.hub
  if (hub) {
    delete opts.hub
    result = await client.run({ command, args: opts, url: hub })
  } else {
    result = await client[command](opts)
  }

  console.log(
    (typeof result === 'string' ? result : JSON.stringify(result)).trim()
  )
}

run()
