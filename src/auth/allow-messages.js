const verify = require('../commands/verify')

const isAllowed = async function({ command, userPublicKey, trustedKeys }) {
  if (trustedKeys.includes(userPublicKey)) return true
  const allowMessage = await this.client
    .list({ type: 'allow', publicKey: userPublicKey, $limit: 1 })
    .then(results => results[0])
  const verified = allowMessage && verify(allowMessage, { all: true })
  if (!verified) return false
  if (allowMessage.commands) {
    return allowMessage.commands.includes(command)
  }
  return verified
}

module.exports = {
  isAllowed,
}
