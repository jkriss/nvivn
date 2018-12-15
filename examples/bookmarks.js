const fs = require('fs')
const ndjson = require('ndjson')
const remoteRun = require('../src/util/remote-run')
const setup = require('../src/util/setup')
const getStore = require('../src/util/store-connection')
const PQueue = require('p-queue')

const queue = new PQueue({ concurrency: 5 })

const importMessages = async (file, hub) => {
  const { config, client } = await setup()
  let count = 0
  const readStream = fs
    .createReadStream(file, 'utf8')
    .pipe(ndjson.parse())
    .on('data', async obj => {
      queue.add(async () => {
        // console.log("bookmark:", obj)
        obj.tags = obj.tags.trim() === '' ? [] : obj.tags.split(/\s/)
        const m = await client.create({
          t: new Date(obj.time).getTime(),
          type: 'bookmark',
          source: 'pinboard',
          body: obj,
        })
        await client.sign(m).then(client.post)
        count++
        // console.log(count)
        // if (hub) {
        //   try {
        //     const signed = await sign(m, { keys })
        //     const command = {
        //       type: 'command',
        //       command: 'post',
        //       args: {
        //         message: signed,
        //       },
        //     }
        //     const createdCommand = await create(command)
        //     const signedCommand = await sign(createdCommand, { keys })
        //     const posted = await remoteRun(signedCommand, hub)
        //     console.log(JSON.stringify(posted))
        //   } catch (err) {
        //     throw err
        //   }
        // } else {
        //   const posted = await post(m, { keys, messageStore })
        //   console.log(JSON.stringify(posted))
        // }
      })
    })
}

if (require.main === module) {
  const args = process.argv.slice(2)
  importMessages(args[0], args[1])
}
