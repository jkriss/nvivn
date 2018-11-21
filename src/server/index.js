require('dotenv').config()
const debug = require('debug')('nvivn:server')
const { send, json } = require('micro')
const loadKeys = require('../util/load-keys')
const getStore = require('../util/store-connection')
const url = require('url')
const { post, list, del } = require('../index')
const multibase = require('multibase')
const querystring = require('querystring')

const keys = loadKeys()
const publicKey = multibase.encode('base58flickr', keys.publicKey).toString()
const messageStore = getStore(process.env.NVIVN_MESSAGE_STORE, { publicKey })

module.exports = async (req, res) => {
  const requestUrl = url.parse(req.url)
  // const path = requestUrl.pathname
  const opts = { messageStore, keys }
  let result
  const q = querystring.parse(requestUrl.query)
  debug('querystring:', q)
  const limit = q.limit || 100
  delete q.limit
  // const result = await nvivn(command, { messageStore })
  // res.end(command)
  if (req.method === 'GET') {
    result = list()
    result = await opts.messageStore.filter(q, opts)
  } else if (req.method === 'POST') {
    const message = await json(req)
    debug('posting', message)
    // TODO validate this before writing
    result = await post(message, opts)
  } else if (req.method === 'DELETE') {
    const hash = requestUrl.pathname.slice(1)
    debug('deleting', hash)
    result = await del(hash, Object.assign({}, opts, q))
  } else {
    return send(res, 404)
  }
  debug('result:', result)
  if (typeof result !== 'undefined') {
    const iterableResult =
      result[Symbol.asyncIterator] || result[Symbol.iterator]
        ? result
        : [result]
    let count = 0
    for await (const r of iterableResult) {
      if (limit && count >= limit) {
        break
      }
      const str = typeof r === 'string' ? r : JSON.stringify(r)
      res.write(str + '\n')
      count++
    }
  }
  res.end()
}
