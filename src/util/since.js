const datemath = require('datemath-parser')

const sinceExtractor = ({ publicKey, since }) => {
  const t = datemath.parse(since.toString())
  return m => {
    const sig = m.meta.signed.find(s => s.publicKey === publicKey)
    if (!sig)
      throw new Error(`Messaage ${m.meta.hash} not signed by ${publicKey}`)
    return sig.t > t
  }
}

module.exports = sinceExtractor
