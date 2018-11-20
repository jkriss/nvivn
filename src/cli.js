const { docopt } = require('docopt')
const getStdin = require('get-stdin')
const { create, post, sign, verify } = require('./index')
const keys = require('./util/keys')
const loadKeys = require('./util/load-keys')

const doc = `
nvivn
Usage:
  nvivn generate [--env]
  nvivn login [--force] [--generate] [--print] <username>
  nvivn logout <username>
  nvivn create (--stdin | - | <message>)
  nvivn sign [options] (--stdin | - | <message>)
  nvivn post [options] (--stdin | - | <message>)
  nvivn delete [options] <message-id>
  nvivn verify (--stdin | - | <message>)
  nvivn list [options] [--new] [<filter>...]
Options:
  -u <username>, --username <username>       Username.
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

const run = async args => {
  let result
  const opts = {}
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
  }
  return result
}

const nvivn = async command => {
  const args = await parse({ argv: command })
  // console.error("args:", args)
  return run(args)
}

module.exports = {
  parse,
  run,
  nvivn,
}

if (require.main === module) {
  nvivn()
}
