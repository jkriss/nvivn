const BLAKE2s = require('blake2s-js')
const scrypt = require('scrypt-async')
const sodium = require('sodium-universal')
const zxcvbn = require('zxcvbn')
const signatures = require('sodium-signatures')
const { encode } = require('./encoding')

function getScryptKey(key, salt, callback) {
  const opts = {
    logN: 17,
    r: 8,
    interruptStep: 1000,
    dkLen: 64,
    encoding: 'binary',
  }
  scrypt(key, salt, opts, callback)
}

function getKeyPair(key, salt, callback) {
  const keyHash = new BLAKE2s(sodium.crypto_sign_SEEDBYTES)
  keyHash.update(Buffer.from(key))

  getScryptKey(keyHash.digest(), Buffer.from(salt), seed =>
    callback(signatures.keyPair(seed))
  )
}

function generateId(username, passphrase) {
  const strength = zxcvbn(passphrase.toString())
  // console.log("passphrase strength:", strength.score, strength.crack_times_display, strength.feedback)
  return new Promise((resolve, reject) => {
    if (strength.score < 4) {
      let message = [strength.feedback.warning]
        .concat(strength.feedback.suggestions)
        .join(' ')
      if (message.trim() === '')
        message = 'Add more words or characters to your passphrase'
      return reject(new Error(message))
    }
    getKeyPair(passphrase, username, keyPair => {
      resolve({
        publicKey: encode(keyPair.publicKey),
        secretKey: encode(keyPair.secretKey),
      })
    })
  })
}

module.exports = generateId
