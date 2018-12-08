const cowsay = require('cowsay')

module.exports = {
  ready: server => {
    server.on('message', m => {
      if (m.type === 'cow') {
        console.log(cowsay.say({ text: m.body }) + '\n')
      }
    })
  },
}
