const assert = require('assert')
const LayeredConfig = require('./layered-config')

class LocalstorageConfig extends LayeredConfig {
  constructor(opts) {
    super(opts)
    this.prefix = opts.prefix || 'nvivn:config'
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
  write(layer) {
    const data = this.data(layer.name)
    this.localStorage.setItem(
      `${this.prefix}:${layer.name}`,
      JSON.stringify(data)
    )
  }
  loadAll() {
    this.layers.forEach(layer => {
      const str = this.localStorage.getItem(`${this.prefix}:${layer.name}`)
      const data = JSON.parse(str)
      this.set(layer.name, data, { force: true, silent: true })
    })
  }
}

module.exports = LocalstorageConfig
