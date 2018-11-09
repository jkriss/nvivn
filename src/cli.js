#!/usr/bin/env node
const debug = require('debug')('nvivn:cli')
const Readable = require('stream').Readable
const { docopt } = require('docopt')

const post = require('./commands/post')
const login = require('./commands/login')
const logout = require('./commands/logout')
const verify = require('./commands/verify')
const sign = require('./commands/sign')

const commands = {
  post,
  login,
  logout,
  verify,
  sign
}

const doc = `
nvivn

Usage:
  nvivn create [options] (--stdin | - | <message>)
  nvivn post [options] (--stdin | - | <message>)
  nvivn list [options] [<filter>...]
  nvivn delete [options] <message-id>
  nvivn sign [options] (--stdin | - | <message>)
  nvivn login [--force] [--generate] <username>
  nvivn verify (--stdin | - | <message>)
  nvivn logout <username>
  nvivn peers

Options:
  -u <username>, --username <username>       Username.
  -s <signature, --signature <signature>     Signature for post or action.
  -f <format>, --format <format>             Format of message [default: json].
  -t <type>, --type <type>                   Type of post [default: message].
  --hub <hub>     Communicate with a remote hub.
  -h --help       Show this screen.
  --version       Show version.

`

const toOpts = args => {
  // make the arguments into a regular options object
  const opts = {}
  for (const key of Object.keys(args)) {
    if (args[key] !== null && key.match(/^(--|<)/)) {
      opts[key.replace(/(^(--|<))|>$/g,'')] = args[key]
    } else if (key[0].match(/\w/) && args[key] === true) {
      opts.command = key
    }
  }
  if (args['-'] || args.stdin) {
    // TODO skip this if we're in a browser?
    opts.inputStream = process.stdin
  } else if (opts.message || opts.sign) {
    opts.inputStream = new Readable()
    opts.inputStream.push(opts.message)
    opts.inputStream.push(null)
  }
  return opts
}

const parse = docOpts => {
  const args = docopt(doc, docOpts)
  debug(args)
  const opts = toOpts(args)
  return opts
}

const run = async (opts) => {
  debug("running command", opts.command)

  if (opts.username && opts.keyStore) {
    opts.identity = await opts.keyStore.load(opts.username)
    debug("identity:", opts.identity)
    if (!opts.identity) {
      throw new Error(`No indentity found for ${opts.username}, please log in.`)
    }
  }
  // TODO require opts.fileStore and opts.keyStore
  const cmd = commands[opts.command]
  if (!cmd) throw new Error(`Command "${opts.command}" is not yet implemented.`)
  return cmd(opts)
}

module.exports = {
  parse,
  run
}
