const { multipart, multipartDecode } = require('./multipart')
const { encode, decode } = require('./nvivn-encoding')

const encodeMultipart = (message, opts = {}) => {
  return multipart(encode(message, opts), opts)
}

const decodeMultipart = (parts, opts = {}) => {
  return decode(multipartDecode(parts), opts)
}

module.exports = {
  encode: encodeMultipart,
  decode: decodeMultipart,
}

if (require.main === module) {
  const m = { t: Date.now(), body: '10-4', from: 'jk' }
  const parts = encodeMultipart(m)
  console.log('to transmit:', parts)
  const decoded = decodeMultipart(parts)
  console.log('decoded:', JSON.stringify(decoded, null, 2))
  console.log('decoded length:', Buffer.from(JSON.stringify(decoded)).length)
}
