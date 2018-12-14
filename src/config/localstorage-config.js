const assert = require('assert')
const LayeredConfig = require('./layered-config')

class LocalstorageConfig extends LayeredConfig {
  constructor(opts = {}) {
    super(opts)
    this.prefix = opts.prefix
    // allow overriding for node or alternative storage
    this.localStorage = opts.localStorage || localStorage
    this.loadAll()
    this.on('change', layerName => {
      // save out the new version
      const layer = this._getLayer(layerName)
      assert(layer, `Should have a layer called ${layerName}`)
      if (layer.write === false) return
      this.write(layer)
    })
  }
  getKey(name) {
    return this.prefix ? `${this.prefix}:${name}` : name
  }
  write(layer) {
    const data = this.data(layer.name)
    this.localStorage.setItem(this.getKey(layer.name), JSON.stringify(data))
  }
  loadAll() {
    this.layers.forEach(layer => {
      const str = this.localStorage.getItem(this.getKey(layer.name))
      const data = JSON.parse(str)
      this.set(layer.name, data, { force: true, silent: true })
    })
  }
}

module.exports = LocalstorageConfig
