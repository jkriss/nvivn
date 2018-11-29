#!/usr/bin/env node
const debug = require('debug')('nvivn:nvivn')
const loadConfig = require('../src/util/config')
const { encode } = require('../src/util/encoding')
const { nvivn } = require('../src/cli')
const getStore = require('../src/util/store-connection')

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
  const config = await loadConfig()
  const publicKey = encode(config.keys.publicKey)
  const messageStore = getStore(config.messageStore, { publicKey })

  nvivn(undefined, { getPassphrase, messageStore })
    .then(async result => {
      debug('result:', result)
      if (typeof result === 'undefined') return
      const iterableResult =
        typeof result !== 'string' &&
        (result[Symbol.asyncIterator] || result[Symbol.iterator])
          ? result
          : [result]
      for await (const r of iterableResult) {
        debug('got iterated result', r)
        process.stdout.write(
          typeof r === 'string' ? r : JSON.stringify(r) + '\n'
        )
      }
    })
    .catch(console.error)
}

run()
