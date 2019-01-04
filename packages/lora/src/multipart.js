const cbor = require('cbor')

const RAW = 1
const MULTIPART = 2

const multipart = (bytes, limit = 27) => {
  const parts = []
  // console.log("encoding data", bytes.toString('hex'), bytes.length)
  if (bytes.length < limit - 3) {
    const part = [RAW, bytes]
    // console.log("single part", part, "with length", cbor.encode(part).length)
    return [cbor.encode(part)]
  }
  const headerSpace = bytes.length / (limit - 5) >= 22 ? 7 : 5
  const dataBlockLength = limit - headerSpace
  let pos = 0
  let i = 0
  const totalParts = Math.ceil(bytes.length / dataBlockLength)
  while (pos < bytes.length) {
    const part = [
      MULTIPART,
      i + 1,
      totalParts,
      Buffer.from(bytes.slice(i * dataBlockLength, pos + dataBlockLength)),
    ]
    // console.log("part", i+1, "of", totalParts, part)
    // console.log("part", i+1, "is", cbor.encode(part).length, "bytes")
    i++
    pos = i * dataBlockLength
    parts.push(cbor.encode(part))
  }
  return parts
}

const multipartDecode = binaryMessages => {
  // console.log("decoding", binaryMessages)
  const messages = binaryMessages.map(m => cbor.decodeFirstSync(m))
  if (messages.length === 0) return null
  if (messages[0][0] === RAW) return messages[0][1]
  // iterate once to get the exact buffer size
  let bufSize = 0
  for (const m of messages) {
    // console.log("checking length of", m)
    bufSize += m[3].length
  }
  // console.error("-- total data buffer is", bufSize, "bytes")
  const buf = Buffer.allocUnsafe(bufSize)
  let pos = 0
  for (const m of messages) {
    m[3].copy(buf, pos)
    pos += m[3].length
  }
  return buf
}

class Streamer {
  constructor() {
    this.parts = []
  }
  write(part) {
    this.parts.push(part)
    if (!this.expectedLength) {
      const obj = cbor.decodeFirstSync(part)
      if (obj[0] === RAW) {
        this.expectedLength = 1
      } else if (obj[0] === MULTIPART) {
        this.expectedLength = obj[2]
      }
    }
    if (this.parts.length === this.expectedLength) {
      if (this.onComplete) this.onComplete(this.parts)
    }
  }
  reset() {
    delete this.expectedLength
    this.parts = []
  }
}

module.exports = {
  multipart,
  multipartDecode,
  Streamer,
}
