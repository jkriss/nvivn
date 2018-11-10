require('dotenv').config()
const debug = require('debug')('nvivn:web')
const { text, send } = require('micro')
const url = require('url')
const { parse, run } = require('../cli')
const FileStore = require('../node/filestore')
const passwordStore = require('../node/passwords')

module.exports = async (req, res) => {
  const path = url.parse(req.url).path

  if (req.method === 'GET' && path === '/') {
    if (process.env.NVIVN_PROFILE) {
      const profile = await passwordStore.load(process.env.NVIVN_PROFILE)
      return send(res, 200, {
        id: profile.id,
        publicKey: profile.publicKey,
      })
    } else {
      return send(res, 404)
    }
  }

  if (req.method === 'GET') return send(res, 404)

  // const opts = {}
  debug('req.url', req.url)
  debug('path', path)
  const command = decodeURIComponent(path.slice(1))
  debug('command', command)
  // TODO translate query string into flags?
  let input = ''
  if (['create', 'post', 'sign'].includes(command)) input = '-'
  const opts = parse(
    { argv: `${command} ${input}`.trim().split(' ') },
    { inputStream: req }
  )
  // opts.command = path.slice(1)
  // debug("command", opts.command)
  // opts.inputStream = req
  opts.outputStream = res
  opts.fileStore = new FileStore({ path: process.cwd(), exit: false })
  opts.keyStore = passwordStore
  run(opts)
}
