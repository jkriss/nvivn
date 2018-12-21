const encode = buffer => {
  return buffer.toString('base64')
}

const decode = str => {
  return Buffer.from(str, 'base64')
}

module.exports = {
  encode,
  decode,
}
