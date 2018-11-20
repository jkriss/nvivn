const path = require('path')
const genericStoreTester = require('./generic')
const NedbStore = require('../../src/stores/nedb')

const checkFrequency = 10
genericStoreTester(NedbStore, { checkFrequency })
// const filepath = path.join(__dirname, '..', 'tmp', 'messages.nedb')
// genericStoreTester(NedbStore, { filepath, checkFrequency })
