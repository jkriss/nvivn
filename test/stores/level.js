const genericStoreTester = require('./generic')
const LevelStore = require('../../src/stores/level')
const levelup = require('levelup')
const memdown = require('memdown')

const db = levelup(memdown())

const checkFrequency = 10
// genericStoreTester(LevelStore, { db, checkFrequency })
genericStoreTester(
  'Leveldb (memory)',
  () => new LevelStore({ db, checkFrequency })
)
