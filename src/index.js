const create = require('./commands/create')
const post = require('./commands/post')
const postMany = require('./commands/post-many')
const sign = require('./commands/sign')
const verify = require('./commands/verify')
const del = require('./commands/delete')
const list = require('./commands/list')
const info = require('./commands/info')
const announce = require('./commands/announce')
const lookup = require('./commands/lookup')

module.exports = {
  create,
  post,
  postMany,
  sign,
  verify,
  del,
  list,
  info,
  announce,
  lookup,
}
