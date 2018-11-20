const debug = require('debug')('nvivn:cli')
const { docopt } = require('docopt')
const getStdin = require('get-stdin')
const { create, post, sign, verify } = require('./index')
const keys = require('./util/keys')
const loadKeys = require('./util/load-keys')
const generateId = require('./util/passphrase-ids')

const doc = `
nvivn
Usage:
  nvivn generate [--env]
  nvivn login [--env] <username>
  nvivn logout <username>
  nvivn create (--stdin | - | <message>)
  nvivn sign [options] (--stdin | - | <message>)
  nvivn post [options] (--stdin | - | <message>)
  nvivn delete [options] <message-id>
  nvivn verify (--stdin | - | <message>)
  nvivn list [options] [--new] [<filter>...]
Options:
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
  let result
  const opts = Object.assign({}, passedOpts)
  opts.keys = loadKeys()
  if (args.create) {
    result = create(args['<message>'], opts)
  } else if (args.sign) {
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
    const q = {}
    args['<filter>'].forEach(f => {
      const [key, value] = f.split(':')
      q[key] = value
    })
    debug('filter query now', q)
    result = opts.messageStore ? opts.messageStore.filter(q) : null
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
}

if (require.main === module) {
  nvivn()
}
