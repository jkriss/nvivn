const fs = require('fs')
const ndjson = require('ndjson')
const { create, sign, post } = require('../src/index')
const loadKeys = require('../src/util/load-keys')
const getStore = require('../src/util/store-connection')

const importMessages = async file => {
  const keys = loadKeys()
  const messageStore = getStore()
  let lastPromise
  const readStream = fs
    .createReadStream(file, 'utf8')
    .pipe(ndjson.parse())
    .on('data', async obj => {
      // console.log('tweet:', obj)
      if (lastPromise) await lastPromise
      const m = create({
        t: new Date(obj.created_at).getTime(),
        type: 'tweet',
        source: 'twitter',
        body: obj,
      })
      lastPromise = post(m, { keys, messageStore })
      lastPromise.then(posted => console.log(JSON.stringify(posted)))
    })
}

if (require.main === module) {
  importMessages(process.argv.slice(2)[0])
}
