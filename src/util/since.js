const datemath = require('datemath-parser')

const sinceExtractor = ({ publicKey, since }) => {
  const t = datemath.parse(since.toString())
  return m => {
    // check for a delete action first
    let sig = m.meta.signed.find(
      s => s.publicKey === publicKey && s.type === 'deletion'
    )
    if (!sig) sig = m.meta.signed.find(s => s.publicKey === publicKey)
    if (!sig)
      throw new Error(`Messaage ${m.meta.hash} not signed by ${publicKey}`)
    return sig.t > t
  }
}

module.exports = sinceExtractor
