const parseMessage = (message, opts) => {
  let m = {}
  if (opts.format === 'json') {
    let body
    try {
      const inputMessage = JSON.parse(message)
      // TODO trim any other fields?
      if (inputMessage.body) m = inputMessage
      else m.body = inputMessage
    } catch (err) {
      m.body = message
    }
  } else {
    throw new Error(`Unknown format ${opts.format}`)
  }

  if (opts.identity) {
    m.from = opts.identity.publicKey
  }

  if (!m.type) {
    m.type = opts.type
  }

  if (!m.t) {
    m.t = Date.now()
  }

  return m
}

module.exports = parseMessage
