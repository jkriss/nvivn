#!/usr/bin/env node
const debug = require('debug')('nvivn:cli')
const Readable = require('stream').Readable
const { docopt } = require('docopt')

const post = require('../commands/post')
const login = require('../commands/login')
const verify = require('../commands/verify')

const doc = `
nvivn

Usage:
  nvivn post [options] (--stdin | - | <message>)
  nvivn list [options] [<filter>...]
  nvivn delete [options] <message-id>
  nvivn import [options] (--file <file> | --stdin | -)
  nvivn sign (--stdin | - | <message>)
  nvivn login [options] [--generate] (<username> | --keypath <keypath>)
  nvivn verify (--stdin | - | <message>)
  nvivn logout
  nvivn peers

Options:
  -s <signature, --signature <signature>     Signature for post or action.
  -f <format>, --format <format>             Format of message [default: json].
  --user <username>                          Username
  --type <type>                              Type of post [default: message].
  --hub <hub>     Communicate with a remote hub.
  --force         Ignore warnings.
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
  } else if (opts.message) {
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

  if (opts.user && opts.keyStore) {
    opts.identity = await opts.keyStore.load(opts.user)
    debug("identity:", opts.identity)
  }
  // TODO require opts.fileStore and opts.keyStore
  if (opts.command === 'post') {
    // TODO create a read stream from input or file or whatever
    post(opts)
  } else if (opts.command === 'login') {
    const keys = await login(opts)
    // console.log(keys)
    if (opts.keyStore) {
      await opts.keyStore.save(keys.username, keys, opts)
    }
  } else if (opts.command === 'verify') {
    const results = await verify(opts)
  }
}

module.exports = {
  parse,
  run
}
