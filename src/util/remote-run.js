const debug = require('debug')('nvivn:remote-run')
const fetch = require('cross-fetch')

const remoteRun = async (message, host) => {
  const res = await fetch(host, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
  if (res.status !== 200) {
    throw new Error(res.statusText)
  }
  // TODO make an async iterator for the lines in the response
  const body = await res.text()
  return body
}

module.exports = remoteRun
