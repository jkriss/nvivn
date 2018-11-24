const fs = require('fs')
const ndjson = require('ndjson')
const { create, sign, post } = require('../src/index')
const loadKeys = require('../src/util/load-keys')
const getStore = require('../src/util/store-connection')
const remoteRun = require('../src/util/remote-run')
const PQueue = require('p-queue')

const queue = new PQueue({ concurrency: 5 })

const importMessages = async (file, hub) => {
  const keys = loadKeys()
  const messageStore = getStore()
  let lastPromise
  const readStream = fs
    .createReadStream(file, 'utf8')
    .pipe(ndjson.parse())
    .on('data', async obj => {
      queue.add(async () => {
        // console.log('tweet:', obj)
        let m = create({
          t: new Date(obj.created_at).getTime(),
          type: 'tweet',
          source: 'twitter',
          body: obj,
        })
        if (hub) {
          const signed = await sign(m, { keys })
          const command = {
            type: 'command',
            command: 'post',
            args: {
              message: signed,
            },
          }
          const createdCommand = await create(command)
          const signedCommand = await sign(createdCommand, { keys })
          const posted = await remoteRun(signedCommand, hub)
          process.stdout.write(posted)
        } else {
          const posted = post(m, { keys, messageStore })
          console.log(JSON.stringify(posted))
        }
      })
    })
}

if (require.main === module) {
  const args = process.argv.slice(2)
  importMessages(args[0], args[1])
}
