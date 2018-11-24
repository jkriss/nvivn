const getStore = require('../util/store-connection')
const keyUtil = require('../util/keys')
const { encode, decode } = require('../util/encoding')
const Client = require('../client/index')

const getPassphrase = async () => {
  console.error('TODO: implement passphrase collection')
}

let publicKey, secretKey

const loadKeys = () => {
  publicKey = localStorage.getItem('NVIVN_PUBLIC_KEY')
  secretKey = localStorage.getItem('NVIVN_PRIVATE_KEY')
}

const saveKeys = k => {
  localStorage.setItem('NVIVN_PUBLIC_KEY', encode(k.publicKey))
  localStorage.setItem('NVIVN_PRIVATE_KEY', encode(k.secretKey))
}

loadKeys()
if (!publicKey) {
  const k = keyUtil.generate()
  saveKeys(k)
  loadKeys()
}

console.log(publicKey)

const keys = {
  publicKey: decode(publicKey),
  secretKey: decode(secretKey),
}

const messageStore = getStore(`leveljs:${publicKey}/messages`, { publicKey })

window.client = new Client({ keys, messageStore })
