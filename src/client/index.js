const debug = require('debug')('nvivn:client')
const { create, sign, list, del, post } = require('../index')
const remoteRun = require('../util/remote-run')

const commands = {
  remote,
  create,
  del: ({ hash, hard }, { messageStore }) => del(hash, { hard, messageStore }),
  sign,
  post,
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

async function remote({ command, args, hub, opts }) {
  debug(`generating command ${command} for remote hub`, hub)
  const m = { command, type: 'command', args }
  // create and sign
  const fullMessage = await create(m, opts)
  const signedMessage = await sign(fullMessage, opts)
  debug('signed message:', signedMessage)
  // run against remote host
  const result = await remoteRun(signedMessage, hub)
  return result
}

class Client {
  constructor({ keys, messageStore }) {
    this.defaultOpts = {
      keys,
      messageStore,
    }
    ;['create', 'sign', 'post', 'list', 'del'].forEach(c => {
      this[c] = (args = {}, opts = {}) => {
        if (this.server) {
          if (c === 'post') args = { message: args }
        }
        if (c === 'del') args = { hash: args.hash, hard: opts.hard }
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
  async sync(server, opts = {}) {
    debug('syncing with', server, 'with opts', opts)
    const results = await remote({
      command: 'list',
      args: opts,
      opts: this.defaultOpts,
      hub: server,
    })
    for await (const m of results) {
      debug('posting', m)
      await commands.post(m, this.defaultOpts)
    }
  }
  async run(command, args) {
    debug('running', command, args)
    if (this.server) debug('remote server:', this.server)
    let result
    if (this.server && ['post', 'list', 'del'].includes(command)) {
      result = await remote({
        command,
        args,
        opts: this.defaultOpts,
        hub: this.server,
      })
    } else {
      debug('running', command, 'with args', args, 'and opts', this.defaultOpts)
      result = await commands[command](args, this.defaultOpts)
    }
    return result
  }
}

module.exports = Client
