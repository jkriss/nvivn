const genericStoreTester = require('./generic')
const MemoryStore = require('../../src/stores/memory')

genericStoreTester('MemoryStore', () => new MemoryStore())
