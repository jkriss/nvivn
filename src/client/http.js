const debug = require('debug')('nvivn:transport:http')
const fetch = require('cross-fetch')
const EventEmitter = require('events')

const createClientTransport = (opts = {}) => {
  const request = message => {
    const emitter = new EventEmitter()
    debug('starting fetch')
    fetch(opts.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
      .then(async res => {
        debug('got fetch response')
        if (res.ok) {
          return res.text()
        } else {
          const m = await res.json()
          emitter.emit('error', m)
        }
      })
      .then(result => {
        if (!result) return emitter.emit('end')
        const trimmed = result.trim()
        const lines = trimmed === '' ? [] : trimmed.split('\n')
        for (const line of lines) {
          try {
            emitter.emit('data', JSON.parse(line))
          } catch (err) {
            emitter.emit(
              'error',
              `Couldn't parse json: ${JSON.stringify(line)}`
            )
          }
        }
        emitter.emit('end')
      })
      .catch(err => {
        emitter.emit('error', err)
      })

    return emitter
  }
  return {
    request,
    end: () => {},
  }
}

module.exports = createClientTransport
