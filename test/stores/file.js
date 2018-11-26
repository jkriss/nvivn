const genericStoreTester = require('./generic')
const FileStore = require('../../src/stores/file')
const fs = require('fs-extra')
const path = require('path')

const testDataDir = path.join(__dirname, '..', 'tmp', 'messages')
fs.ensureDir(testDataDir)
genericStoreTester(
  'FileStore',
  () =>
    new FileStore({
      path: testDataDir,
      datePattern: 'YYYY-MM-DD-HH-mm-ss.SSS',
    })
)
