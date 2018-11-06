const debug = require('debug')('nvivn:login')
const { generateId } = require('../simple/passphrase-id')
const multibase = require('multibase')
const proquint = require('proquint')
const signatures = require('sodium-signatures')

const ID_LENGTH = 3

const login = async opts => {
  let keyPair
  if (opts.username && opts.passphrase) {
    keyPair = await generateId(opts.username, opts.passphrase)
  } else if (opts.username && opts.generate) {
    keyPair = signatures.keyPair()
  }
  const keys = {
    secretKey: multibase.encode('base58flickr', keyPair.secretKey).toString(),
    publicKey: multibase.encode('base58flickr', keyPair.publicKey).toString()
  }
  const id = proquint.encode(keyPair.publicKey.slice(0,ID_LENGTH*2))
  return {
    id,
    username: opts.username,
    ...keys
  }
}

module.exports = login
