#!/usr/bin/env node
const { nvivn } = require('../src/cli')
const prompt = require('prompt')

const getPassphrase = () => {
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

nvivn(undefined, { getPassphrase }).then(result =>
  console.log(typeof result === 'string' ? result : JSON.stringify(result))
)
