const { create, sign, list, del, post } = require('../index')
const getStore = require('../util/store-connection')
const keyUtil = require('../util/keys')
const remoteRun = require('../util/remote-run')
const { encode, decode } = require('../util/encoding')

// const messageStore = getStore('memory')
const messageStore = getStore('nedb:./messages')

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

const defaultOpts = {
  keys,
  messageStore,
}

const remote = async ({ command, args, hub, opts }) => {
  debug(`generating command ${command} for remote hub`, hub)
  const m = { command, type: 'command', args }
  // create and sign
  const fullMessage = await create(m, opts)
  const signedMessage = await sign(fullMessage, opts)
  debug('signed message:', signedMessage)
  // run against remote host
  const result = await remoteRun(signedMessage, hub)
  if (result.trim() === '') return []
  return result
    .trim()
    .split('\n')
    .map(JSON.parse)
}

window.cmd = {
  remote,
  create,
  sign,
  post,
  list: async (q, opts) => {
    const results = list(q, Object.assign({ keys, messageStore }, opts))
    if (typeof results === 'undefined') return []
    const allResults = []
    for await (const r of results) {
      allResults.push(r)
    }
    return allResults
  },
}

class Client {
  constructor({ keys, messageStore }) {
    this.defaultOpts = {
      keys,
      messageStore,
    }
    ;['create', 'sign', 'post', 'list'].forEach(c => {
      this[c] = args => {
        if (this.server) {
          if (c === 'post') args = { message: args }
          if (c === 'del') args = { hash: args }
        }
        return this.run(c, args)
      }
    })
  }
  setServer(server) {
    this.server = server
  }
  clear() {
    return this.defaultOpts.messageStore.clear()
  }
  async run(command, args) {
    debug('running', command, args)
    if (this.server) debug('remote server:', this.server)
    let result
    if (this.server && ['post', 'list'].includes(command)) {
      result = await remote({
        command,
        args,
        opts: this.defaultOpts,
        hub: this.server,
      })
    } else {
      result = await window.cmd[command](args, this.defaultOpts)
    }
    return result
  }
}

window.client = new Client({ keys, messageStore })

window.test = async () => {
  const m = cmd.create({ body: 'hi' })
  const signed = await cmd.sign(m)
  await cmd.post(signed)
  const results = await cmd.list()
  console.log(results.map(JSON.stringify))
}
