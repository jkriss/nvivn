const { create, sign } = require('@nvivn/core')

class Client {
  constructor({ keys, fetch }) {
    this.keys = keys
    this.fetch = fetch
  }
  create(args) {
    return create(args)
  }
  sign(message) {
    return sign(message, { keys: this.keys })
  }
  run({ command, args, url }) {
    const m = this.sign(
      this.create({
        type: 'command',
        command,
        args,
      })
    )
    return this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(m),
    }).then(res => res.text())
  }
}

module.exports = Client
