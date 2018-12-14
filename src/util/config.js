const debug = require('debug')('nvivn:config')
const path = require('path')
const findFile = require('./find-file')
const FileConfig = require('../config/file-config')
const nvivnConfig = require('../config/nvivn-config')

const loadConfig = async ({ filepath } = {}) => {
  if (!filepath) filepath = path.join(process.cwd(), '.nvivn')
  const defaults = {
    messageStore: 'file:./messages',
  }
  const baseFile = await findFile({
    basename: path.join(filepath, 'config'),
    extensions: ['json', 'yaml', 'yml '],
  })
  debug('using base file:', baseFile)
  const config = new FileConfig({
    path: filepath,
    layers: [
      { name: 'default', data: defaults, write: false },
      { file: baseFile, immutable: true },
      { file: 'node' },
    ],
  })
  return nvivnConfig(config)
}

module.exports = {
  loadConfig,
}

if (require.main === module) {
  loadConfig().then(config => console.log(config.data()))
}
