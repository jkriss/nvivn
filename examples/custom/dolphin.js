const debug = require('debug')('nvivn:custom:dolphin')
debug('loaded custom dolphin logic')

function isAllowed({ message, userPublicKey, trustedKeys, settings }) {
  if (message.command === 'post') {
    // anyone can post a dolphnish message as long as its signed
    const m = message.args
    const dolphinish = m.body && !!m.body.match(/^e+$/i)
    debug(`is ${m.body} dolphinish? ${dolphinish}`)
    // throw an error to provide more detail
    if (!dolphinish) throw new Error(`This message isn't dolphinish`)
    // or can just return a boolean
    return dolphinish
  } else {
    return trustedKeys.includes(userPublicKey)
  }
}

module.exports = {
  isAllowed,
}
