const createSignature = require('../util/sign')

const sign = (message, opts) => {
  const m = Object.assign({}, message)
  if (opts.keys) {
    const signatureObj = createSignature(m, {
      keys: opts.keys,
      signProps: opts.signProps,
    })
    if (!m.meta.signed) m.meta.signed = []
    m.meta.signed.push(signatureObj)
  }
  return m
}

module.exports = sign
