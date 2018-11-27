const debug = require('debug')('nvivn:remote-run')
const fetch = require('node-fetch')
const ndjson = require('ndjson')
const waitUntilReadable = require('./wait-until-readable')

const generator = stream => {
  return async function*() {
    const readStream = ndjson.parse()
    // console.log("reading from", stream)
    stream.pipe(readStream)
    let obj
    do {
      obj = readStream.read()
      if (!obj) {
        await waitUntilReadable(stream)
        obj = readStream.read()
      }
      // debug("!!! got obj", obj)
      if (obj) yield obj
    } while (obj)
  }
}

const streamToIterator = stream => {
  return {
    [Symbol.asyncIterator]: generator(stream),
  }
}

const remoteRun = async (message, host, opts = {}) => {
  const res = await fetch(host, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
  if (res.status !== 200) {
    let body
    try {
      body = await res.json()
    } catch (err) {}
    throw new Error(`${body ? `${body.message}: ` : ''}${res.statusText}`)
  }
  // console.log("trying to read response:", res)
  if (opts.iterator) return streamToIterator(res.body)
  const body = await res.text()
  if (body.trim() === '') return []
  return body
    .trim()
    .split('\n')
    .map(JSON.parse)
}

module.exports = remoteRun
