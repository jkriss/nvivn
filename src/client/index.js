const debug = require('debug')('nvivn:client')
const { create, sign, list, del, post, postMany, info } = require('../index')
const { encode } = require('../util/encoding')
const sortBy = require('lodash.sortby')
const MemSyncStore = require('./mem-sync-store')
const createHttpClient = require('./http')
const without = require('../util/without')

const commands = {
  remote,
  create,
  del: ({ hash, hard }, { messageStore }) => del(hash, { hard, messageStore }),
  sign,
  post,
  postMany,
  info,
  list: async (q, opts) => {
    const results = list(q, opts)
    if (typeof results === 'undefined') return []
    const allResults = []
    for await (const r of results) {
      allResults.push(r)
    }
    return allResults
  },
}

async function remote({ command, args, transport, opts }) {
  debug(`generating command ${command} for remote transport with args`, args)
  const m = { command, type: 'command', args: without(args, 'transport') }
  // create and sign
  const fullMessage = await create(m, opts)
  const signedMessage = await sign(fullMessage, opts)
  debug('signed message:', signedMessage)
  // run against remote host
  // const result = await remoteRun(signedMessage, hub)
  // return result
  const req = transport.request(signedMessage)
  return new Promise((resolve, reject) => {
    // just buffer them all for now, can get fancy later
    const results = []
    req.on('data', d => results.push(d))
    req.on('error', err => reject(err))
    req.on('end', () => {
      resolve(command === 'list' ? results : results[0])
    })
  })
}

class Client {
  constructor({
    keys,
    messageStore,
    syncStore,
    info,
    peers,
    transportGenerator,
  }) {
    this.syncStore = syncStore || new MemSyncStore()
    this.peers = peers || []
    this.defaultOpts = {
      keys,
      messageStore,
      info,
    }
    this.transportGenerator = transportGenerator || createHttpClient
    ;['create', 'sign', 'post', 'postMany', 'list', 'del', 'info'].forEach(
      c => {
        this[c] = (args = {}, opts = {}) => {
          if (this.transport) {
            if (c === 'post') args = { message: args }
          }
          if (c === 'del') args = { hash: args.hash, hard: opts.hard }
          return this.run(c, args)
        }
      }
    )
  }
  async signCommand({ command, args }) {
    const m = { command, type: 'command', args }
    const fullMessage = await create(m, this.defaultOpts)
    const signedMessage = await sign(fullMessage, this.defaultOpts)
    return signedMessage
  }
  getPublicKey({ encoded } = {}) {
    const k = this.defaultOpts.keys.publicKey
    return encoded ? encode(k) : k
  }
  setTransport(transport) {
    debug('set transport to', transport)
    this.transport = transport
  }
  clear() {
    return this.defaultOpts.messageStore.clear()
  }
  async pull({ publicKey, url }, opts = {}) {
    const serverInfo = await this.resolveServerInfo({ publicKey, url })
    const serverKey = `${serverInfo.publicKey}:pull`
    const lastPull = await this.syncStore.get(serverKey)
    const start = Date.now()
    const args = Object.assign({ since: lastPull }, opts)
    debug('pulling from', serverInfo, 'with args', args)
    // TODO make this an option so we can sync with other server types
    const transport = opts.transport || serverInfo.transport
    debug('listing remote messages with', args)
    const results = await remote({
      command: 'list',
      args,
      opts: this.defaultOpts,
      transport,
    })
    debug(`sorting ${results.length} pulled results`)
    // sort them oldest first, so newer stuff shows up first when listed
    const sortedResults = sortBy(results, 't')
    let count = 0
    for await (const m of sortedResults) {
      // debug('posting', m)
      await commands.post(m, this.defaultOpts)
      count++
    }
    await this.syncStore.put(serverKey, start)
    debug('pulled', count, serverKey)
    return { count }
  }
  async resolveServerInfo({ publicKey, url }) {
    if (!publicKey && !url) throw new Error('Must provide publicKey or url')
    let transport
    if (url) {
      // TODO warn if public key changes?
      transport = await this.transportGenerator({ url })
      const info = await remote({
        command: 'info',
        opts: this.defaultOpts,
        transport,
      })
      if (publicKey && publicKey !== info.publicKey) {
        throw new Error(
          `Expected public key ${publicKey} from ${url}, but got ${
            info.publicKey
          }`
        )
      }
      publicKey = info.publicKey
    } else if (publicKey && !url) {
      // TODO check local network, other lookup methods
    }
    if (!publicKey) throw new Error(`Couldn't find public key for ${url}`)
    if (!transport && url) transport = await this.transportGenerator({ url })
    return { publicKey, url, transport }
  }
  async push({ publicKey, url }, opts = {}) {
    // get public key from the url, or vice versa (local discovery)
    const serverInfo = await this.resolveServerInfo({ publicKey, url })
    const serverKey = `${serverInfo.publicKey}:push`
    const lastPush = await this.syncStore.get(serverKey)
    const start = opts.start || Date.now()
    const results = await this.list({ since: lastPush })
    const transport = opts.transport || serverInfo.transport
    const messages = []
    // const writes = []
    for await (const m of results) {
      // if it's a delete that's happened since the last sync, send it
      // otherwise, only send it if it hasn't already been routed by this

      const alreadySeen = m.meta.signed.find(
        s => s.publicKey === serverInfo.publicKey
      )
      // TODO need to verify the routing signature so people can't keep messages from being routed this way
      // actually, these should be verified on their way in

      const recentDeletionMessage = m.meta.signed.find(
        s => s.type === 'deletion' && s.t > start
      )
      const sendMessage = !alreadySeen && !recentDeletionMessage
      // console.log(`message ${m.meta.hash} seen by ${serverInfo.publicKey}? ${alreadySeen}`)
      // console.log("  ", m.meta.signed)
      if (sendMessage) messages.push(m)
    }
    debug('posting', messages.length, 'messages')
    if (messages.length > 0) {
      // do this in chunks so it doesn't get out of hand
      const chunk = 1000
      for (let i = 0, j = messages.length; i < j; i += chunk) {
        const someMessages = messages.slice(i, i + chunk)
        await remote({
          command: 'postMany',
          args: { messages: someMessages },
          opts: this.defaultOpts,
          transport,
        })
      }
    }
    await this.syncStore.put(serverKey, start)
    debug('pushed', messages.length, serverKey)
    return { count: messages.length }
  }
  async sync(server, opts = {}) {
    if (!server) {
      return Promise.all(this.peers.map(p => this.sync(p, opts)))
    }
    const pull = await this.pull(server, opts)
    const push = await this.push(server, opts)
    return {
      push,
      pull,
      server,
    }
  }
  close() {
    if (this.transport) this.transport.end()
  }
  async run(command, args) {
    debug('running', command, args)
    if (this.transport) debug('remote transport:', this.transport)
    let result
    if (
      this.transport &&
      ['post', 'postMany', 'list', 'del', 'info'].includes(command)
    ) {
      result = await remote({
        command,
        args,
        opts: this.defaultOpts,
        transport: this.transport,
      })
    } else {
      debug('running', command, 'with args', args)
      result = await commands[command](args, this.defaultOpts)
    }
    return result
  }
}

module.exports = Client
