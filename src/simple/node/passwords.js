const keytar = require('keytar')
const SERVICE_NAME = 'nvivn'

const save = async (account, identity, opts={}) => {
  const stringifiedIdentity = JSON.stringify(identity)
  // if this doesn't match what we have on file, throw an error
  const existingKeys = await load(account)
  if (!opts.force && existingKeys && JSON.stringify(existingKeys) !== stringifiedIdentity) {
    throw new Error(`Already have credentials for ${identity.username}, but these don't match`)
  }
  return keytar.setPassword(SERVICE_NAME, account, stringifiedIdentity)
}

const load = async account => {
  const stringifiedIdentity = await keytar.getPassword(SERVICE_NAME, account)
  return JSON.parse(stringifiedIdentity)
}

const del = account => {
  return keytar.deletePassword(SERVICE_NAME, account)
}

module.exports = {
  save,
  load,
  del
}
