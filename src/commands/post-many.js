const debug = require('debug')('nvivn:post-many')
const post = require('./post')

const postMany = async (args, opts) => {
  debug('bulk posting', args.messages.length, 'messages')
  const results = await post(args.messages, opts)
  debug('bulk post results', results)
  return results
}

module.exports = postMany
