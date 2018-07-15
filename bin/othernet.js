#!/usr/bin/env node

const minimist = require('minimist')
const debug = require('debug')('othernet:cli')
const oyaml = require('oyaml')
const fs = require('fs')
const split2 = require('split2')
const config = require('../src/config')
const FileHub = require('../src/hub/file')
const signing = require('../src/signing')
require('colors')

const hubConfig = config.loadLocalConfig()
const userConfig = config.loadUserConfig()

const hub = new FileHub(hubConfig)

const argv = minimist(process.argv.slice(2), {
  boolean: 'showMeta',
  alias: {
    showMeta: ['m']
  }
})
let cmd = argv._.join(' ')

debug('opts', argv)

if (argv._[0] === 'server') {
  const server = require('../src/server')
  const port = argv.p || 9999
  server(hub).listen(port, () => {
    console.log(`server is listening at http://localhost:${port}`)
  })
} else {
  const parsedCmd = oyaml.parse(cmd, { array: true })
  let cmdParts = oyaml.parts(cmd)

  const signIfPossible = function(payload, { id, secretKey }={}) {
    const body = oyaml.parse(payload)
    if (!id) id = body.from || userConfig.id
    if (!secretKey) secretKey = userConfig.secretKey
    if (id && secretKey) {
      const bodyString = oyaml.stringify(body)
      debug("signing", payload)
      const meta = {
        signed: [ { id, signature: signing.sign(payload, secretKey) }]
      }
      return [payload, oyaml.stringify(meta)].join(" | ")
    } else {
      return payload
    }
  }

  if (parsedCmd[0].op === 'create-message') {
    const payload = cmdParts[1]
    cmd = [cmdParts[0], signIfPossible(payload)].join(" | ")
    debug("cmd now", cmd)
  }

  // const s = hub.getCommandStream()
  // s.write(cmd)
  // if (argv.f) {
  //   fs.createReadStream(argv.f).pipe(split2()).pipe(s)
  // } else {
  //   s.end()
  // }
  // s.pipe(process.stdout)
  const [input, output] = hub.getCommandStreams()
  output.pipe(process.stdout)
  input.write(cmd)
  if (argv.f) {
    fs.createReadStream(argv.f).pipe(split2()).pipe(input)
  } else {
    input.end()
  }
}
