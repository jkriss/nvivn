const debug = require('debug')('nvivn:login')
const multibase = require('multibase')
const proquint = require('proquint')
const signatures = require('sodium-signatures')
const { generateId } = require('../passphrase-id')

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
    publicKey: multibase.encode('base58flickr', keyPair.publicKey).toString(),
  }
  const id = proquint.encode(keyPair.publicKey.slice(0, ID_LENGTH * 2))
  const identity = {
    id,
    username: opts.username,
    ...keys,
  }
  if (opts.keyStore && !opts.print) {
    await opts.keyStore.save(identity.username, identity, opts)
  }
  if (opts.print) {
    opts.outputStream.write(JSON.stringify(identity) + '\n')
  }
  return identity
}

module.exports = login
