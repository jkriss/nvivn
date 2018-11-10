#!/usr/bin/env node
const debug = require('debug')('nvivn:cli:node')
const readlineSync = require('readline-sync')
const { parse, run } = require('../src/cli')
const passwordStore = require('../src/node/passwords')
const FileStore = require('../src/node/filestore')
const colors = require('colors/safe')
const fetch = require('node-fetch')
const through2 = require('through2')

if (require.main === module) {
  const opts = parse()
  if (
    opts.command === 'login' &&
    opts.username &&
    !opts.passphrase &&
    !opts.generate
  ) {
    const passphrase = readlineSync.question('passphrase: ', {
      hideEchoBack: true,
    })
    opts.passphrase = passphrase
  }
  if (opts.hub) {
    // the output stream goes to an http post,
    // and the response from *that* goes to stdout
    const endpoint = `${opts.hub}/${opts.originalCommand
      .join(' ')
      .replace(/--hub ?\S+/, '')}`
    debug('sending request to', endpoint)

    // if (opts.inputStream) {
    if (opts.command === 'post') {
      // we're reading from a stream, so pipe that
      // through to the remote hub
      const throughStream = through2(function(chunk, enc, callback) {
        this.push(chunk)
        callback()
      })

      const res = fetch(endpoint, { method: 'POST', body: throughStream }).then(
        res => res.body.pipe(process.stdout)
      )
      opts.outputStream = throughStream
    } else {
      // TODO form a signed message to pass along
      const res = fetch(endpoint, { method: 'POST' }).then(res =>
        res.body.pipe(process.stdout)
      )
    }
  } else {
    opts.outputStream = process.stdout
    // pass it a fileStore and keyStore
    opts.fileStore = new FileStore({ path: process.cwd() })
  }
  opts.keyStore = passwordStore
  run(opts).catch(err => {
    console.error(colors.red(err.message))
    process.exit(1)
  })
}
