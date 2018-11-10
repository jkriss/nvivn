const debug = require('debug')('nvivn:web')
const { text } = require('micro')
const url = require('url')
const { parse, run } = require('../cli')
const FileStore = require('../node/filestore')

module.exports = async (req, res) => {
  // const opts = {}
  const path = url.parse(req.url).path
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
  run(opts)
}
