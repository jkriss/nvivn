const figlet = require('figlet')

const ascii = (opts = {}) => {
  const settings = () => {
    return new Promise((resolve, reject) => {
      figlet.text(
        opts.greeting || 'nvivn',
        { font: opts.font || 'Graffiti' },
        (err, data) => {
          if (err) return reject(err)
          resolve({ info: { greeting: data } })
        }
      )
    })
  }
  return {
    settings,
  }
}

module.exports = ascii

if (require.main === module) {
  ascii(null, { greeting: 'welcome to nvivn' })
}
