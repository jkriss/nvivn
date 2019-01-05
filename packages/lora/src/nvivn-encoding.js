const cbor = require('cbor')
const mapObj = require('map-obj')
const hash = require('@nvivn/core/util/hash')
const clone = require('clone')
const pick = require('lodash.pick')
const omit = require('lodash.omit')

const keyToAbbrev = {
  type: 1,
  body: 2,
  publicKey: 3,
  meta: 4,
  hash: 5,
  signed: 6,
  signature: 7,
  id: 8,
  nodeId: 9,
  about: 'A',
  _hashValid: 'z',
}

const commonValues = {
  type: {
    message: 1,
    info: 2,
    command: 3,
    checkin: 4,
  },
}

const abbrevToKey = {}
for (const k of Object.keys(keyToAbbrev)) {
  abbrevToKey[keyToAbbrev[k]] = k
}

const commonValuesReverse = {}
for (const k of Object.keys(commonValues)) {
  const rev = {}
  for (const expanded of Object.keys(commonValues[k])) {
    rev[commonValues[k][expanded]] = expanded
  }
  commonValuesReverse[k] = rev
}

const encodeField = (obj, field, encoding) => {
  if (!obj[field]) return
  const buf = Buffer.from(obj[field], encoding)
  obj[field] = buf
}

const decodeField = (obj, field, encoding) => {
  if (!obj[field]) return
  obj[field] = obj[field].toString(encoding)
}

const dehydrateShallow = obj => {
  return mapObj(obj, (k, v) => {
    const newKey = keyToAbbrev[k] || k
    let newVal = v
    if (commonValues[k] && commonValues[k][v]) {
      newVal = commonValues[k][v]
    }
    return [newKey, newVal]
  })
}

const dehydrate = obj => {
  const h = dehydrateShallow(obj)
  const metaKey = keyToAbbrev.meta
  const signedKey = keyToAbbrev.signed
  if (h[metaKey]) {
    h[metaKey] = dehydrateShallow(h[metaKey])
    if (h[metaKey][signedKey]) {
      h[metaKey][signedKey] = h[metaKey][signedKey].map(dehydrateShallow)
    }
  }

  return h
}

const hydrate = obj => {
  const h = hydrateShallow(obj)
  if (h.meta) {
    h.meta = hydrateShallow(h.meta)
    if (h.meta.signed) {
      h.meta.signed = h.meta.signed.map(hydrateShallow)
    }
  }
  return h
}

const hydrateShallow = obj => {
  return mapObj(obj, (k, v) => {
    const newKey = abbrevToKey[k] || k
    let newVal = v
    if (commonValuesReverse[newKey] && commonValuesReverse[newKey][v]) {
      newVal = commonValuesReverse[newKey][v]
    }
    return [newKey, newVal]
  })
}

const transform = (message, fn, opts = {}) => {
  // const m = Object.assign({}, message)
  const m = clone(message)
  fn(m, 'publicKey', 'base64')
  if (m.meta) {
    fn(m.meta, 'hash', 'hex')
    if (m.meta.signed) {
      for (const sig of m.meta.signed) {
        fn(sig, 'publicKey', 'base64')
        fn(sig, 'signature', 'base64')
      }
    }
  }
  if (m.bytes) fn(m, 'bytes', 'base64')
  return m
}

const encode = (message, opts = {}) => {
  if (typeof message !== 'object') return message
  let obj = transform(message, encodeField, opts)
  // delete the hash, recompute when we hydrate
  if (obj.meta) {
    if (obj.meta.hash) {
      delete obj.meta.hash
    }
    if (obj.meta.signed && opts.skip && opts.skip.includes('meta.signed')) {
      delete obj.meta.signed
    }
    if (Object.keys(obj.meta).length === 0) {
      delete obj.meta
    }
  }
  const originalKeys = Object.keys(obj).filter(k => k !== 'meta')
  if (opts.only) obj = pick(obj, opts.only)
  if (opts.skip) obj = omit(obj, opts.skip)
  const newKeys = Object.keys(obj).filter(k => k !== 'meta')
  if (newKeys.toString() === originalKeys.toString()) {
    obj._hashValid = true
  }
  const dehydrated = dehydrate(obj)
  // console.log("cboring:", dehydrated)
  // console.log("cboring meta:", dehydrated[keyToAbbrev.meta])
  return cbor.encode(dehydrated)
}

const decode = (message, opts = {}) => {
  const obj = cbor.decodeFirstSync(message)
  if (typeof obj !== 'object') {
    console.log('cbor decoded thing is', obj)
    return obj
  }
  const hydrated = hydrate(obj)

  const transformed = transform(hydrated, decodeField)
  // console.log("hash valid?", transformed._hashValid)
  if (transformed._hashValid && !opts.skipHash) {
    delete transformed._hashValid
    if (!transformed.meta) transformed.meta = {}
    transformed.meta.hash = hash(transformed)
  }
  return transformed
}

module.exports = {
  encode,
  decode,
}

// if (require.main === module) {
//   const zlib = require('zlib')
//   // const m = require('./message2.json')
//   const m = require('./info.json')
//   const encoded = encode(m)
//   // const encoded = encode(m, { skip: ['meta.signed', 'type', 'id'] })
//   // const encoded = encode(m, { skip: ['meta.signed'] })
//   // const encoded = encode(m, { only: ['publicKey'] })
//   console.log(encoded)
//   console.log("encoded in", encoded.length, "bytes")
//   // console.log("gzipped, it's", zlib.gzipSync(encoded).length, "bytes")
//   console.log("original json was", JSON.stringify(m).length, "bytes")
//   console.log("gzipped json was", zlib.gzipSync(JSON.stringify(m)).length, "bytes")
//   console.log("hash was:", m.meta.hash)
//   const decoded = decode(encoded)
//   console.log(decoded)
// }
