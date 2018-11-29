const fetch = require('cross-fetch')
const EventEmitter = require('events')

const createClientTransport = (opts = {}) => {
  const request = message => {
    const emitter = new EventEmitter()
    fetch(opts.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
      .then(async res => {
        if (res.status === 200) {
          return res.text()
        } else {
          const m = await res.json()
          emitter('error', m)
        }
      })
      .then(result => {
        const lines = result.trim().split('\n')
        for (const line of lines) {
          emitter.emit('data', JSON.parse(line))
        }
        emitter.emit('end')
      })
    return emitter
  }
  return {
    request,
    end: () => {},
  }
}

module.exports = createClientTransport
