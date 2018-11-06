// const signatures = require('sodium-signatures')
const sodium = require('sodium-universal')
const passwordStore = require('./node/passwords')
const multibase = require('multibase')
const { generateId } = require('./passphrase-id')

const sign = function (message, secretKey) {
  var signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, message, secretKey)
  return signature
}

const verify = function (message, signature, publicKey) {
  return sodium.crypto_sign_verify_detached(signature, message, publicKey)
}

;(async function() {
  // var keys = signatures.keyPair()
  // var sodiumKeys = signatures.keyPair()
  // const identity = {
  //   secretKey: multibase.encode('base58flickr', sodiumKeys.secretKey).toString(),
  //   publicKey: multibase.encode('base58flickr', sodiumKeys.publicKey).toString()
  // }


  // const identity = await passwordStore.load('jkriss')
  // console.log("identity:", identity)
  // const keys = {
  //   publicKey: multibase.decode(identity.publicKey),
  //   secretKey: multibase.decode(identity.secretKey)
  // }

  const keys = await generateId('testuser', '09usl;akv;lgij 34ltkjasd;lkvjsadg')
  // console.log("encoded secret key:", multibase.encode('base58flickr', keys.secretKey).toString())

  console.log("keys:", keys)

  var message = Buffer.from('a message')

  var signature = sign(message, keys.secretKey)
  var verified = verify(message, signature, keys.publicKey)

  console.log('message was verified', verified)

})()
