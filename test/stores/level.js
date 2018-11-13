const genericStoreTester = require('./generic')
const LevelStore = require('../../src/stores/level')
const levelup = require('levelup')
const memdown = require('memdown')

const checkFrequency = 10
const db = levelup(memdown({ checkFrequency }))

genericStoreTester(LevelStore, { db, checkFrequency })
