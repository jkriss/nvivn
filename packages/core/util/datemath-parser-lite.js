const timestring = require('timestring')

const parse = str => {
  if (str.match(/now[-+]/)) {
    const match = str.match(/\d.*/)
    if (match) {
      const delta = timestring(match[0]) * 1000
      const now = Date.now()
      return str.includes('+') ? now + delta : now - delta
    }
  } else if (str.trim() === 'now') {
    return Date.now()
  } else {
    try {
      new Date(str)
      return d.getTime()
    } catch (err) {}
  }
}

module.exports = { parse }
