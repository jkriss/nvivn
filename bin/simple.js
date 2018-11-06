#!/usr/bin/env node
const debug = require('debug')('nvivn:cli:node')
const readlineSync = require('readline-sync')
const { parse, run } = require('../src/simple/cli')
const passwordStore = require('../src/simple/node/passwords')
const colors = require('colors/safe')

if (require.main === module) {
  const opts = parse()
  if (opts.command === 'login' && opts.username && !opts.passphrase && !opts.generate) {
    const passphrase = readlineSync.question('passphrase: ', {
      hideEchoBack: true
    })
    opts.passphrase = passphrase
  }
  opts.outputStream = process.stdout
  // pass it a fileStore and keyStore
  opts.keyStore = passwordStore
  run(opts).catch(err => {
    console.error(colors.red(err.message))
    process.exit(1)
  })
}
