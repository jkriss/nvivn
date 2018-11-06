const formatMessage = (message, format) => {
  if (format === 'json') {
    return JSON.stringify(message)
  } else {
    throw new Error(`Unknown format ${format}`)
  }
}

module.exports = formatMessage