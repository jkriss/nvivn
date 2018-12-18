const debug = require('debug')('nvivn:config:file')
const LayeredConfig = require('./layered-config')
const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const assert = require('assert')
const yamlConfig = require('../util/yaml-config')
const chokidar = require('chokidar')

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
    super(Object.assign(opts, { layers, asyncLoad: true }))
    this.path = opts.path || process.cwd()
    this.on('change', layerName => {
      // save out the new version
      const layer = this._getLayer(layerName)
      assert(layer, `Should have a layer called ${layerName}`)
      if (layer.write === false) return
      if (layer.skipWrite) {
        delete layer.skipWrite
        return
      }
      if (!layer.file) layer.file = layer.name
      this.write(layer)
        .then(() => this.emit('saved', layerName))
        .catch(err => this.emit('error', `Error saving ${layerName}: ${err}`))
    })
    this.loadAll()
  }
  getPath(layer) {
    debug('checking layer path', layer.file, layer)
    return path.isAbsolute(layer.file)
      ? layer.file
      : path.join(this.path, layer.file)
  }
  getPathByName(layerName) {
    const layer = this._getLayer(layerName)
    return layer && this.getPath(layer)
  }
  write(layer) {
    const fullPath = this.getPath(layer)
    const data = this.data(layer.name)
    let str
    if (layer.ext && layer.ext.match(/\.ya?ml/)) {
      str = yaml.safeDump(data)
    } else {
      str = JSON.stringify(data, null, 2)
    }
    return fs.ensureFile(fullPath).then(() => fs.writeFile(fullPath, str))
  }
  load(layer, opts = {}) {
    const fullPath = this.getPath(layer)
    debug('loading', layer, fullPath)
    if (!layer.watcher) {
      layer.watcher = chokidar.watch(fullPath, { persistent: true })
      layer.watcher.on('change', () => {
        debug(`${fullPath} changed, reloading`)
        layer.skipWrite = true
        this.load(layer).then(() => {
          this.emit('change', layer.name)
          this.emit(`${layer.name}:change`)
        })
      })
    }
    return fs
      .readFile(fullPath, 'utf8')
      .then(fileData => {
        debug('got file data', fileData)
        let data
        try {
          if (layer.ext && layer.ext.match(/\.ya?ml/)) {
            data = yamlConfig(fileData)
          } else {
            data = JSON.parse(fileData)
          }
        } catch (err) {
          console.error('error parsing data', err)
          data = {}
        }
        debug(`loaded layer ${layer.name}`, data)
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
  close() {
    this.layers
      .filter(layer => layer.watcher)
      .forEach(layer => layer.watcher.close())
  }
}

module.exports = FileConfig
