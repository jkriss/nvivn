const debug = require('debug')('nvivn:cli')
const { docopt } = require('docopt')
const getStdin = require('get-stdin')
const { create, post, sign, verify, del, list } = require('./index')
const keys = require('./util/keys')
const loadConfig = require('./util/config')
const generateId = require('./util/passphrase-ids')
const oyaml = require('oyaml')
const remoteRun = require('./util/remote-run')

const doc = `
nvivn
Usage:
  nvivn generate [--env]
  nvivn login [--env] <username>
  nvivn logout <username>
  nvivn create [--nosign] (--stdin | - | <message>...)
  nvivn sign [options] (--stdin | - | <message>)
  nvivn post [options] (--stdin | - | <message>)
  nvivn delete [options] <hash> [--hard]
  nvivn verify (--stdin | - | <message>)
  nvivn list [options] [--new] [<filter>...]
  nvivn server [--port <port>] [--tcp] [--http] [--https] [--socket <socket>]
Options:
  --type <type>   Type of signature
  --hub <hub>     Communicate with a remote hub.
  -h --help       Show this screen.
  --version       Show version.
`

const parse = async (docOpts = {}) => {
  const args = docopt(doc, docOpts)
  if (args['-'] || args.stdin) {
    args['<message>'] = await getStdin()
  }
  try {
    args['<message>'] = JSON.parse(args['<message>'])
  } catch (err) {}
  return args
}

const run = async (args, passedOpts) => {
  const config = await loadConfig()
  let result
  const opts = Object.assign({}, passedOpts)
  opts.keys = config.keys
  debug('args:', args)

  if (args.server) {
    if (args['<port>']) process.env.PORT = args['<port>']
    if (args['<socket>']) process.env.SOCKET = args['<socket>']
    if (args['--https']) require('./server/secure')
    else if (args['--tcp']) require('./server/standalone-tcp')
    else require('./server/standalone-http')
    return []
  }

  if (args['--hub']) {
    const command = Object.keys(args).find(
      a => a[0].match(/[a-z]/i) && args[a] === true
    )
    debug(`generating command ${command} for remote hub`, args['--hub'])
    const m = { command, type: 'command' }
    // for now, the format is different per command
    if (command === 'list') {
      const q = oyaml.parse(args['<filter>'].join(' '), { unflatten: false })
      m.args = q
    } else if (command === 'post') {
      m.args = args['<message>']
    } else if (command === 'delete') {
      m.args = { hash: args['<hash>'], hard: args['--hard'] }
    }
    // create and sign
    const fullMessage = await create(m, opts)
    const signedMessage = await sign(fullMessage, opts)
    debug('signed message:', signedMessage)
    // run against remote host
    result = await remoteRun(signedMessage, args['--hub'])
  } else if (args.create) {
    let message = Array.isArray(args['<message>'])
      ? args['<message>'][0]
      : args['<message>']
    try {
      message = oyaml.parse(args['<message>'].join(' '))
    } catch (err) {
      debug('tried to parse', message)
      try {
        message = JSON.parse(message)
      } catch (err2) {}
    }
    result = create(message, opts)
  } else if (args.sign) {
    opts.signProps = {}
    if (args['--type']) opts.signProps.type = args['--type']
    result = sign(args['<message>'], opts)
  } else if (args.generate) {
    result = keys.generate()
    if (args['--env']) result = keys.env(result)
  } else if (args.verify) {
    result = verify(args['<message>'], opts)
    if (result.find(r => r === true)) result = args['<message>']
  } else if (args.login) {
    result = await generateId(args['<username>'], args['--passphrase'])
    if (args['--env']) result = keys.env(result)
  } else if (args.post) {
    result = await post(args['<message>'], opts)
  } else if (args.list) {
    debug('filtering with', args)
    debug('parsing', args['<filter>'].join(' '), 'with oyaml')
    const q = oyaml.parse(args['<filter>'].join(' '), { unflatten: false })
    debug('filter query now', q)
    result = await list(q, opts)
  } else if (args.delete) {
    debug('deleting', args['<hash>'])
    result = await del(
      args['<hash>'],
      Object.assign({}, opts, { hard: !!args['--hard'] })
    )
  }
  return result
}

const nvivn = async (command, opts = {}) => {
  const args = await parse({ argv: command })

  // get the passphrase if we need one
  if (args['<username>']) {
    args['--passphrase'] = await opts.getPassphrase()
  }
  // console.error("args:", args)
  return run(args, opts)
}

module.exports = {
  parse,
  run,
  nvivn,
  doc,
}

if (require.main === module) {
  nvivn()
}
