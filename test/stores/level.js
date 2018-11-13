const genericStoreTester = require('./generic')
const LevelStore = require('../../src/stores/level')
const levelup = require('levelup')
const memdown = require('memdown')

const db = levelup(memdown())

genericStoreTester(LevelStore, { db })
