#!/usr/bin/env node
require('dotenv').config()
const debug = require('debug')('nvivn:nvivn')
const { nvivn } = require('../src/cli')
const getStore = require('../src/util/store-connection')
const multibase = require('multibase')

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

const publicKey = multibase
  .encode('base58flickr', multibase.decode(process.env.NVIVN_PUBLIC_KEY))
  .toString()
const messageStore = getStore(process.env.NVIVN_MESSAGE_STORE, { publicKey })

nvivn(undefined, { getPassphrase, messageStore }).then(async result => {
  debug('result:', result)
  const iterableResult =
    result[Symbol.asyncIterator] || result[Symbol.iterator] ? result : [result]
  for await (const r of iterableResult) {
    console.log(typeof r === 'string' ? r : JSON.stringify(r))
  }
})
