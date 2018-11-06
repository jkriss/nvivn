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

  if (!m.type) {
    m.type = opts.type
  }

  return m
}

module.exports = parseMessage