const path = require('path')
const genericStoreTester = require('./generic')
const NedbStore = require('../../src/stores/nedb')

const checkFrequency = 10
// genericStoreTester(NedbStore, { checkFrequency })
genericStoreTester('NedbStore', () => new NedbStore({ checkFrequency }))
