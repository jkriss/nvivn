const debug = require('debug')('nvivn:client')
const { create, sign, list, del, post, info } = require('../index')
const { encode } = require('../util/encoding')
const sortBy = require('lodash.sortby')
const MemSyncStore = require('./mem-sync-store')
const createHttpClient = require('./http')

const commands = {
  remote,
  create,
  del: ({ hash, hard }, { messageStore }) => del(hash, { hard, messageStore }),
  sign,
  post,
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
  debug(`generating command ${command} for remote transport`)
  const m = { command, type: 'command', args }
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
  constructor({ keys, messageStore, syncStore, info }) {
    this.syncStore = syncStore || new MemSyncStore()
    this.defaultOpts = {
      keys,
      messageStore,
      info,
    }
    ;['create', 'sign', 'post', 'list', 'del', 'info'].forEach(c => {
      this[c] = (args = {}, opts = {}) => {
        if (this.transport) {
          if (c === 'post') args = { message: args }
        }
        if (c === 'del') args = { hash: args.hash, hard: opts.hard }
        return this.run(c, args)
      }
    })
  }
  async signCommand({ command, args }) {
    const m = { command, type: 'command', args }
    const fullMessage = await create(m, this.defaultOpts)
    const signedMessage = await sign(fullMessage, this.defaultOpts)
    return signedMessage
  }
  getPublicKey() {
    return this.defaultOpts.keys.publicKey
  }
  setTransport(transport) {
    debug('set transport to', transport)
    this.transport = transport
  }
  clear() {
    return this.defaultOpts.messageStore.clear()
  }
  async sync(server, opts = {}) {
    const lastSync = await this.syncStore.get(server)
    const start = Date.now()
    const args = Object.assign(
      { since: lastSync ? lastSync.latest : undefined },
      opts
    )
    debug('syncing with', server, 'with args', args)
    // TODO make this an option so we can sync with other server types
    const transport = await createHttpClient({
      url: server,
    })
    const results = await remote({
      command: 'list',
      args,
      opts: this.defaultOpts,
      transport,
    })
    // sort them oldest first, so newer stuff shows up first when listed
    const sortedResults = sortBy(results, 't')
    for await (const m of sortedResults) {
      // debug('posting', m)
      await commands.post(m, this.defaultOpts)
    }
    this.syncStore.put(server, { latest: start })
  }
  close() {
    if (this.transport) this.transport.end()
  }
  async run(command, args) {
    debug('running', command, args)
    if (this.transport) debug('remote transport:', this.transport)
    let result
    if (this.transport && ['post', 'list', 'del', 'info'].includes(command)) {
      result = await remote({
        command,
        args,
        opts: this.defaultOpts,
        transport: this.transport,
      })
    } else {
      debug('running', command, 'with args', args, 'and opts', this.defaultOpts)
      result = await commands[command](args, this.defaultOpts)
    }
    return result
  }
}

module.exports = Client
