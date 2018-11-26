const waitUntilReadable = require('./wait-until-readable')

async function* streamAsyncIterator(stream) {
  while (true) {
    // await waitUntilReadable(stream)
    let value = await stream.read()
    if (!value) {
      await waitUntilReadable(stream)
      value = await stream.read()
    }
    if (!value) return
    yield value
  }
}

module.exports = streamAsyncIterator
