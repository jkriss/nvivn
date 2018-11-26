const genericStoreTester = require('./generic')
const LevelStore = require('../../src/stores/level')
const level = require('level')
const fs = require('fs-extra')
const path = require('path')

const testDataDB = path.join(__dirname, '..', 'tmp', 'messages.db')
fs.ensureDir(testDataDB).then(() => {
  const db = level(testDataDB)

  const checkFrequency = 10
  genericStoreTester(
    'Leveldb (file)',
    () => new LevelStore({ db, checkFrequency })
  )
})
