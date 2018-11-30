const create = require('./commands/create')
const post = require('./commands/post')
const postMany = require('./commands/post-many')
const sign = require('./commands/sign')
const verify = require('./commands/verify')
const del = require('./commands/delete')
const list = require('./commands/list')
const info = require('./commands/info')

module.exports = {
  create,
  post,
  postMany,
  sign,
  verify,
  del,
  list,
  info,
}
