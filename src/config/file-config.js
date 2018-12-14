const LayeredConfig = require('./layered-config')
const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const assert = require('assert')

class FileConfig extends LayeredConfig {
  constructor(opts) {
    // load the data from the file system, then call super
    const layerDefs = opts.layers || []
    const layers = layerDefs.map(layer => {
      const meta = {}
      if (layer.file) {
        if (!layer.name) {
          meta.name = path.parse(layer.file).name
        }
        meta.ext = path.extname(layer.file)
      }
      return Object.assign({}, layer, meta)
    })
    super(Object.assign(opts, { layers }))
    this.path = opts.path || process.cwd()
    this.on('change', layerName => {
      // save out the new version
      const layer = this._getLayer(layerName)
      assert(layer, `Should have a layer called ${layerName}`)
      this.write(layer)
        .then(() => this.emit('saved', layerName))
        .catch(err => this.emit('error', `Error saving ${layerName}: ${err}`))
    })
    this.loadAll()
  }
  getPath(layer) {
    return path.join(this.path, layer.file)
  }
  getPathByName(layerName) {
    const layer = this._getLayer(layerName)
    return layer && this.getPath(layer)
  }
  write(layer) {
    const fullPath = this.getPath(layer)
    const data = this.data(layer.name)
    let str
    if (layer.ext === '.json') {
      str = JSON.stringify(data, null, 2)
    } else if (layer.ext.match(/\.ya?ml/)) {
      str = yaml.safeDump(data)
    }
    return fs.ensureFile(fullPath).then(() => fs.writeFile(fullPath, str))
  }
  load(layer) {
    const fullPath = this.getPath(layer)
    return fs
      .readFile(fullPath, 'utf8')
      .then(fileData => {
        let data
        if (layer.ext === '.json') {
          data = JSON.parse(fileData)
        } else if (layer.ext.match(/\.ya?ml/)) {
          data = yaml.safeLoad(fileData)
        }
        assert(data, 'Config layer must be json or yaml')
        this.set(layer.name, data, { force: true, silent: true })
      })
      .catch(err => {
        if (err.code === 'ENOENT') return
        else throw err
      })
  }
  loadAll() {
    Promise.all(
      this.layers.filter(layer => layer.file).map(layer => this.load(layer))
    ).then(() => {
      this.emit('ready')
    })
  }
}

module.exports = FileConfig
