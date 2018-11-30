const debug = require('debug')('nvivn:client')
const { create, sign, list, del, post, info } = require('../index')
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
  async pull(server, opts = {}) {
    const serverKey = `${server}:pull`
    const lastPull = await this.syncStore.get(serverKey)
    const start = Date.now()
    const args = Object.assign({ since: lastPull }, opts)
    debug('pulling from', server, 'with args', args)
    // TODO make this an option so we can sync with other server types
    const transport =
      opts.transport ||
      (await createHttpClient({
        url: server,
      }))
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
    debug('pulled', count)
    return { count }
  }
  async push(server, opts = {}) {
    const serverKey = `${server}:push`
    const lastPush = await this.syncStore.get(serverKey)
    const start = opts.start || Date.now()
    // do stuff
    const results = await this.list({ since: lastPush })
    let count = 0
    const transport =
      opts.transport ||
      (await createHttpClient({
        url: server,
      }))
    for await (const m of results) {
      count++
      await remote({
        command: 'post',
        args: m,
        opts: this.defaultOpts,
        transport,
      })
    }
    await this.syncStore.put(serverKey, start)
    debug('pushed', count)
    return { count }
  }
  async sync(server, opts = {}) {
    const push = await this.push(server, opts)
    // as of now, this will also return the ones that just got pushed
    const pull = await this.pull(server, opts)
    return {
      push,
      pull,
    }
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
      debug('running', command, 'with args', args)
      result = await commands[command](args, this.defaultOpts)
    }
    return result
  }
}

module.exports = Client
