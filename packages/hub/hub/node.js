const debug = require('debug')('nvivn:config')
const path = require('path')
const findFile = require('../util/find-file')
const FileConfig = require('../config/file-config')
const nvivnConfig = require('../config/nvivn-config')
const Hub = require('./common')

const loadConfig = async ({ filepath, settings, watch } = {}) => {
  if (!filepath) filepath = path.join(process.cwd(), '.nvivn')
  const defaults = {
    // messageStore: 'file:./.nvivn/messages',
    messageStore: 'leveldb:./.nvivn/messages.db',
  }
  const baseFile = await findFile({
    basename: path.join(filepath, 'config'),
    extensions: ['json', 'yaml', 'yml '],
  })
  debug('using base file:', baseFile)
  const config = new FileConfig({
    watch,
    path: filepath,
    layers: [
      { name: 'default', data: defaults, write: false },
      { file: baseFile, immutable: true },
      { file: 'keys', data: {} },
      { name: 'settings', data: settings },
      { file: 'node' },
    ],
  })
  return nvivnConfig(config)
}

const setup = async ({ settings, filepath } = {}) => {
  const config = await loadConfig({ settings, filepath })
  return new Hub(config)
}

module.exports = {
  setup,
  loadConfig,
}
