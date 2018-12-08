const debug = require('debug')('nvivn:client')
const assert = require('assert')
const {
  create,
  sign,
  list,
  del,
  post,
  postMany,
  info,
  verify,
  announce,
  lookup,
} = require('../index')
const { encode, decode } = require('../util/encoding')
const sortBy = require('lodash.sortby')
const createHttpClient = require('./http')
const without = require('../util/without')
const stringify = require('fast-json-stable-stringify')
const friendlyCron = require('friendly-cron')
const CronJob = require('cron').CronJob
const EventEmitter = require('events')

const commands = {
  remote,
  create,
  del: ({ hash, hard }, { messageStore, keys }) =>
    del(hash, { hard, messageStore, keys }),
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
  verify,
  announce,
  lookup,
}

async function remote({ command, args, transport, opts }) {
  debug(`generating command ${command} for remote transport`)
  const m = { command, type: 'command', args: without(args, 'transport') }
  // create and sign
  const fullMessage = await create(m, opts)
  const signedMessage = await sign(fullMessage, opts)
  // debug('signed message:', signedMessage)
  // run against remote host
  return new Promise((resolve, reject) => {
    try {
      debug('starting remote request')
      const req = transport.request(signedMessage)
      debug('finished remote request, handling data')

      // just buffer them all for now, can get fancy later
      const results = []
      req.on('data', d => results.push(d))
      req.on('error', err => {
        debug('error running remote call:', err)
        reject(err)
      })
      req.on('end', () => {
        debug(`finished running ${command}`)
        resolve(command === 'list' ? results : results[0])
      })
    } catch (err) {
      debug('error running remote call:', err)
      reject(err)
    }
  })
}

class Client extends EventEmitter {
  constructor({
    keys,
    messageStore,
    transportGenerator,
    skipValidation,
    config,
  }) {
    super()
    this.peers = []
    const settings = config.data()
    this.defaultOpts = {
      keys,
      messageStore,
      skipValidation,
      info: settings.info,
      config,
    }
    this.config = config
    this.crons = {}
    debug('checking info:', settings.info)
    if (!settings.info) settings.info = {}
    if (!settings.info.nodeId) {
      debug('no id, setting')
      const nodeId = Math.random()
        .toString(32)
        .slice(2, 8)
      settings.info.id = `${nodeId}${
        settings.info.appName ? `.${settings.info.appName}` : ''
      }.${decode(this.defaultOpts.keys.publicKey).toString('hex')}.nvivn`
      settings.info.nodeId = nodeId
      config.set({ info: settings.info })
      debug('set info to', config.data().info)
      this.setFromConfig(config.data())
    }

    config.on('change', this.setFromConfig.bind(this))
    this.transportGenerator = transportGenerator || createHttpClient
    ;[
      'create',
      'sign',
      'post',
      'postMany',
      'list',
      'del',
      'info',
      'verify',
      'announce',
      'lookup',
    ].forEach(c => {
      this[c] = (args = {}, opts = {}) => {
        if (this.transport) {
          if (c === 'post') args = { message: args }
        }
        if (c === 'del') args = { hash: args.hash, hard: opts.hard }
        return this.run(c, args)
      }
    })
  }
  setFromConfig(config) {
    debug('got new config:', config)
    if (config.peers) this.peers = config.peers
    this.defaultOpts.info = config.info
    if (this._autoSync) {
      debug('restarting sync cron jobs')
      this.stopAutoSync()
      this.setupSync()
      this.startAutoSync()
    } else {
      this.setupSync()
    }
  }
  setupSync() {
    for (const peer of this.peers) {
      if (peer.sync) {
        debug(`will sync with ${JSON.stringify(peer)} ${peer.sync}`)
        const cronPattern = friendlyCron(peer.sync) || peer.sync
        this.crons[peer] = new CronJob(cronPattern, () => {
          if (this.crons[peer] && this.crons[peer].isRunning) {
            return
          }
          debug('syncing with', peer)
          this.crons[peer].isRunning = true
          this.sync(peer)
            .catch(err => this.emit('error', err))
            .finally(() => {
              this.crons[peer].isRunning = false
            })
        })
      }
    }
  }
  addPeer(peer) {
    this.peers.push(peer)
    this.config.set('peers', this.peers)
  }
  startAutoSync() {
    this._autoSync = true
    for (const job of Object.values(this.crons)) {
      job.start()
    }
  }
  stopAutoSync() {
    this._autoSync = false
    for (const job of Object.values(this.crons)) {
      job.stop()
    }
  }
  startAnnouncing({ connect, interval } = {}) {
    if (!connect) connect = this.config.data().info.connect
    assert(connect, `'connect' option must be specified`)
    if (!interval) interval = 60 * 60 * 1000 // one hour
    const announceFn = () => {
      debug('announcing...')
      this.announce({ expr: Date.now() + interval * 2 })
        .then(this.post)
        .then(() => debug('posted announcement message for', connect))
    }
    this.stopAnnouncing()
    this.announcementInterval = setInterval(announceFn, interval)
    // if there's an active announce that's still correct, don't need to fire one off right away
    this.lookup({ id: this.defaultOpts.info.id }).then(announcements => {
      const announcement = announcements[0]
      const lastsLongEnough =
        announcement && announcement.expr > Date.now() + interval
      const sameInfo =
        announcement && stringify(connect) === stringify(announcement.connect)
      debug('lastsLongEnough?', lastsLongEnough)
      debug('sameInfo?', sameInfo)
      if (lastsLongEnough && sameInfo) {
        debug('already a valid announcement hanging around')
      } else {
        debug('no record new enough, announcing')
        announceFn()
      }
    })
  }
  stopAnnouncing() {
    if (this.announcementInterval) {
      clearInterval(this.announcementInterval)
    }
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
  getSync(key) {
    assert(key, `Can't return a sync value for an undefined key`)
    debug('getting sync entry for', key)
    const syncs = this.config.data().syncs || {}
    return syncs[key]
  }
  setSync(key, value) {
    assert(key, `Can't set a sync value for an undefined key`)
    const syncs = this.config.data().syncs || {}
    syncs[key] = value
    this.config.set({ syncs })
  }
  async pull({ publicKey, url }, opts = {}) {
    const serverInfo = await this.resolveServerInfo({ publicKey, url })
    const serverKey = `${serverInfo.id}:${stringify(
      without(opts, 'transport')
    )}:pull`
    const lastPull = this.getSync(serverKey)
    const start = Date.now() - 1
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
    debug(`sorting complete`)
    // let count = 0
    const count = sortedResults.length
    await commands.postMany({ messages: sortedResults }, this.defaultOpts)
    if (!opts.$limit) this.setSync(serverKey, start)
    debug('pulled', count, serverKey)
    const pullResult = Object.assign(
      { count, start },
      without(serverInfo, 'transport')
    )
    this.emit('pulled', pullResult)
    return pullResult
  }
  async resolveServerInfo({ publicKey, url }) {
    debug('resolving server with', publicKey, url)
    if (!publicKey && !url) throw new Error('Must provide publicKey or url')
    let transport, id
    if (url) {
      transport = await this.transportGenerator({ url })
      const info = await remote({
        command: 'info',
        opts: this.defaultOpts,
        transport,
      })
      debug('!! got info response:', info)
      assert(
        verify(info, { all: true }),
        `info message from ${url} was not properly signed`
      )
      assert.equal(
        info.publicKey,
        info.meta.signed[0].publicKey,
        `info message from ${url} was signed with ${
          info.meta.signed[0].publicKey
        }, expected ${info.publicKey}`
      )
      if (publicKey) {
        assert.equal(
          publicKey,
          info.publicKey,
          `Expected public key ${publicKey} from ${url}, but got ${
            info.publicKey
          }`
        )
      }
      publicKey = info.publicKey
      id = info.id
    } else if (publicKey && !url) {
      // TODO check local network, other lookup methods
    }
    if (!publicKey) throw new Error(`Couldn't find public key for ${url}`)
    if (!transport && url) transport = await this.transportGenerator({ url })
    return { id, transport }
  }
  async push({ publicKey, url, all }, opts = {}) {
    // get public key from the url, or vice versa (local discovery)
    const serverInfo = await this.resolveServerInfo({ publicKey, url })
    debug('pushing to server info', serverInfo)
    const serverKey = `${serverInfo.id}:${stringify(
      without(opts, 'transport')
    )}:push`
    const lastPush = all ? undefined : this.getSync(serverKey)
    debug('last push', lastPush)
    const start = Date.now() - 1
    const results = await this.list({ since: lastPush })
    const transport = opts.transport || serverInfo.transport
    const messages = []
    // const writes = []
    for await (const m of results) {
      // if it's a delete that's happened since the last sync, send it
      // otherwise, only send it if it hasn't already been routed by this

      const alreadySeen = false
      // const alreadySeen = m.meta.signed.find(
      //   s => s.publicKey === serverInfo.publicKey
      // )
      const recentDeletionMessage = m.meta.signed.find(
        s => s.type === 'deletion' && (!lastPush || s.t > lastPush)
      )
      const sendMessage = recentDeletionMessage || !alreadySeen
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
    if (!opts.$limit) this.setSync(serverKey, start)
    debug('pushed', messages.length, serverKey)
    const pushResults = Object.assign(
      { count: messages.length, start },
      without(serverInfo, 'transport')
    )
    this.emit('pushed', pushResults)
    return pushResults
  }
  async sync(server, opts = {}) {
    if (!server) {
      debug('syncing peers:', this.peers)
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
    // debug('running', command, args)
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
      // debug('running', command, 'with args', args)
      const fn = commands[command] || this[command].bind(this)
      assert(fn, `${command} is not a known command`)
      result = await fn(args, this.defaultOpts)
      if (command === 'post' && result) {
        this.emit('message', result)
      }
    }
    return result
  }
}

module.exports = Client
