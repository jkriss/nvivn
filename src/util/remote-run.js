const debug = require('debug')('nvivn:remote-run')
const fetch = require('cross-fetch')

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
  // TODO make an async iterator for the lines in the response
  if (opts.stream) return res.body
  const body = await res.text()
  return body
}

module.exports = remoteRun
