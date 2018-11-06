#!/usr/bin/env node
const debug = require('debug')('nvivn:cli:node')
const readlineSync = require('readline-sync')
const { parse, run } = require('../src/simple/cli')
const passwordStore = require('../src/simple/node/passwords')

if (require.main === module) {
  const opts = parse()
  if (opts.username && !opts.passphrase && !opts.generate) {
    const passphrase = readlineSync.question('passphrase: ', {
      hideEchoBack: true
    })
    opts.passphrase = passphrase
  }
  opts.outputStream = process.stdout
  // pass it a fileStore and keyStore
  opts.keyStore = passwordStore
  run(opts).catch(console.error)
}
