const fs = require('fs')
const ndjson = require('ndjson')
const { create, sign } = require('../src/index')
const loadKeys = require('../src/util/load-keys')

const importMessages = async file => {
  const keys = loadKeys()
  const readStream = fs
    .createReadStream(file, 'utf8')
    .pipe(ndjson.parse())
    .on('data', obj => {
      // console.log("bookmark:", obj)
      const m = create({
        t: new Date(obj.time).getTime(),
        type: 'bookmark',
        source: 'pinboard',
        body: obj,
      })
      const signed = sign(m, { keys })
      console.log(JSON.stringify(signed))
    })
}

if (require.main === module) {
  importMessages(process.argv.slice(2)[0])
}
