module.exports = {
  isAllowed: ({ message, trustedKeys, userPublicKey }) => {
    console.log('-- checking message', message)
    if (trustedKeys.includes(userPublicKey)) return true
    // if (JSON.stringify(message).match(/trump/i)) return false
  },
}
