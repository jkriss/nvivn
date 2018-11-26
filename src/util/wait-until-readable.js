const waitUntilReadable = stream => {
  return new Promise((resolve, reject) => {
    const cb = () => {
      stream.removeListener('readable', cb)
      stream.removeListener('end', cb)
      resolve()
    }
    const errCb = err => {
      stream.removeListener('error', errCb)
      reject(err)
    }
    stream.on('error', errCb)
    stream.on('readable', cb)
    stream.on('end', cb)
  })
}

module.exports = waitUntilReadable
