const debug = require('debug')('nvivn:proquint:token')
const assert = require('assert')
const proquint = require('proquint')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const ID_LENGTH = 4
const CUTOFF = (ID_LENGTH / 2) * 6

const generate = (length = 8) => {
  assert(length >= 6, 'Tokens must be at least 6 bytes long')
  assert(length % 2 == 0, 'Length must be a multiple of 2')
  const id = proquint.encode(crypto.randomBytes(ID_LENGTH))
  const token = proquint.encode(crypto.randomBytes(length - ID_LENGTH))
  const code = [id, token].join('-')
  var salt = bcrypt.genSaltSync(10)
  const hashedToken = bcrypt.hashSync(token, salt)
  return {
    secret: code,
    store: {
      id,
      hashedToken,
    },
  }
}

const validate = async (code, lookup) => {
  // first two words are id
  const id = code.slice(0, CUTOFF - 1)
  const token = code.slice(CUTOFF)
  debug('validating id:', id, 'and token', token)
  const hash = await lookup(code)
  return bcrypt.compareSync(token, hash)
  // const storedHash =
}

const cli = () => {
  const invite = generate()
  console.error(invite.secret)
  invite.store.type = 'invitation'
  console.log(JSON.stringify(invite.store))
}

if (require.main === module) {
  cli()
  // const invite = generate()
  // console.error(invite.secret)
  // console.log(JSON.stringify(invite.store))
  // validate(invite.secret, () => invite.store.hash).then(console.log)
}
