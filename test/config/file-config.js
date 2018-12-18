const tap = require('tap')
const Config = require('../../src/config/file-config')
const path = require('path')
const fs = require('fs-extra')
const sleep = require('await-sleep')

tap.test('create a new file config', function(t) {
  t.plan(1)
  const config = new Config({
    path: path.join(__dirname, 'files'),
    layers: [
      { file: 'config.yaml', immutable: true },
      { file: 'node.json' },
      { file: 'state.json' },
    ],
  })
  config.on('ready', () => {
    t.same(config.data().greeting, 'hello!')
    config.close()
  })
})

tap.test('allow non-file layers', function(t) {
  t.plan(1)
  const config = new Config({
    path: path.join(__dirname, 'files'),
    layers: [
      { name: 'default', data: { version: 1 }, immutable: true },
      { file: 'config.yaml', immutable: true },
    ],
  })
  config.on('ready', () => {
    t.same(config.data().version, 1)
    config.close()
  })
})

tap.test('write new files as needed', function(t) {
  t.plan(4)
  const config = new Config({
    path: path.join(__dirname, 'files'),
    layers: [
      { file: 'config.yaml', immutable: true },
      { file: 'tmp/node.json' },
    ],
  })
  const layerFilename = config.getPathByName('node')
  fs.removeSync(layerFilename)
  const randomId = Math.random()
    .toString(32)
    .slice(2, 10)
  config.set('node', { nodeId: randomId })
  config.on('ready', () => {
    t.same(config.data().greeting, 'hello!', `should load data from file`)
  })
  config.on('change', layerName => {
    t.same(layerName, 'node')
    t.same(config.data().nodeId, randomId, 'get the change event immediately')
  })
  config.on('saved', layerName => {
    t.ok(fs.existsSync(layerFilename), 'the file should exist')
    config.close()
  })
})

tap.test('reload the file if it changes on disk', function(t) {
  t.plan(2)
  fs.writeJSON(path.join(__dirname, 'files', 'tmp', 'will-edit.json'), {
    greeting: 'hi',
  })
  const config = new Config({
    path: path.join(__dirname, 'files', 'tmp'),
    layers: [{ file: 'will-edit.json', immutable: true }],
  })
  config.on('ready', () => {
    t.same(config.data().greeting, 'hi', `should load data from file`)
    // write new data to the file
    fs.writeJSON(path.join(__dirname, 'files', 'tmp', 'will-edit.json'), {
      greeting: 'hi!!',
    })
    sleep(200).then(() => {
      t.same(
        config.data().greeting,
        'hi!!',
        `should load the new data from file`
      )
      config.close()
    })
  })
})
