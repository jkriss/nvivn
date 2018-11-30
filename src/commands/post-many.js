const debug = require('debug')('nvivn:post-many')
const post = require('./post')

const postMany = async (args, opts) => {
  const results = []
  debug('bulk posting', args.messages.length, 'messages')
  for (const m of args.messages) {
    const result = await post(m, opts)
    results.push(result)
  }
  debug('bulk post results', results)
  return results
}

module.exports = postMany
