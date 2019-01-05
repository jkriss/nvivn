const debug = require('debug')('multipart')
const crypto = require('crypto')
const cbor = require('cbor')
const EventEmitter = require('events')

const RAW = 1
const MULTIPART = 2

const BIGHEADER = 7
const SMALLHEADER = BIGHEADER - 2

const multipart = (bytes, { limit = 27, responseId } = {}) => {
  if (!responseId) responseId = crypto.randomBytes(2)
  debug('response id is', responseId.toString('hex'))
  const parts = []
  // console.log("encoding data", bytes.toString('hex'), bytes.length)
  if (bytes.length < limit - 3) {
    const part = [RAW, bytes, responseId]
    // console.log("single part", part, "with length", cbor.encode(part).length)
    return [cbor.encode(part)]
  }
  const responseIdLength = responseId ? responseId.length + 1 : 0
  const smallheader = SMALLHEADER + responseIdLength
  const bigheader = BIGHEADER + responseIdLength
  let headerSpace =
    bytes.length / (limit - smallheader) >= 22 - responseIdLength
      ? bigheader
      : smallheader
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
      responseId,
    ]
    // console.log("part", i+1, "of", totalParts, part)
    debug('part', i + 1, 'is', cbor.encode(part).length, 'bytes')
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

class Streamer extends EventEmitter {
  constructor() {
    super()
    this.responses = {}
  }
  write(part) {
    const obj = cbor.decodeFirstSync(part)
    const resId = obj[0] === RAW ? obj[2] : obj[4]
    let partNum
    if (!this.responses[resId]) {
      this.responses[resId] = {
        parts: [],
        started: Date.now(),
      }
    }
    const res = this.responses[resId]
    res.parts.push(part)
    // if (!res.expectedLength) {
    if (obj[0] === RAW) {
      res.expectedLength = 1
      partNum = 1
    } else if (obj[0] === MULTIPART) {
      partNum = obj[1]
      res.expectedLength = obj[2]
    }
    // }
    this.emit('progress', {
      id: resId,
      part: partNum,
      total: res.expectedLength,
    })
    if (res.parts.length === res.expectedLength) {
      // if (this.onComplete) this.onComplete(res)
      this.emit('done', res)
      delete this.responses[resId]
      debug('responses now', this.responses)
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
