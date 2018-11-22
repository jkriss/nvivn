const fs = require('fs')
const ndjson = require('ndjson')
const { create, post } = require('../src/index')
const loadKeys = require('../src/util/load-keys')
const getStore = require('../src/util/store-connection')

const importMessages = async file => {
  const keys = loadKeys()
  const messageStore = getStore()
  const readStream = fs
    .createReadStream(file, 'utf8')
    .pipe(ndjson.parse())
    .on('data', async obj => {
      // console.log("bookmark:", obj)
      obj.tags = obj.tags.trim() === '' ? [] : obj.tags.split(/\s/)
      const m = create({
        t: new Date(obj.time).getTime(),
        type: 'bookmark',
        source: 'pinboard',
        body: obj,
      })
      const posted = await post(m, { keys, messageStore })
      console.log(JSON.stringify(posted))
    })
}

if (require.main === module) {
  importMessages(process.argv.slice(2)[0])
}
