const merge = require('merge')
const EventEmitter = require('events')

class Config extends EventEmitter {
  constructor({ layers, asyncLoad } = {}) {
    super()
    this.layers = layers || []
    if (!asyncLoad)
      setTimeout(() => {
        this.emit('ready')
      }, 0)
  }
  _getLayer(layerName) {
    return this.layers.find(layer => layer.name === layerName)
  }
  data(layerName) {
    if (layerName) {
      const layer = this._getLayer(layerName)
      return layer ? layer.data : {}
    } else {
      return merge.recursive(true, ...this.layers.map(layer => layer.data))
    }
  }
  set(layerName, data, opts = {}) {
    let layer = this._getLayer(layerName)
    if (!layer) {
      this.layers.push({ name: layerName, data: {} })
      layer = this._getLayer(layerName)
    }
    if (layer.immutable && !opts.force)
      throw new Error(`Can't set a value for immutable layer ${layerName}`)
    layer.data = merge(true, layer.data, data)
    if (!opts.silent) {
      setTimeout(() => {
        this.emit('change', layerName)
        this.emit(`${layerName}:change`)
      }, 0)
    }
  }
}

module.exports = Config

if (require.main === module) {
  const config = new Config({
    layers: [
      { name: 'defaults', data: { hi: 'there' } },
      { name: 'local', data: { name: 'jesse' } },
      { name: 'state', data: { lastCheck: 0 } },
    ],
  })
  console.log(config.data())
  config.set('state', { lastCheck: Date.now() })
  console.log(config.data())
  config.set('floops', { message: 'florps' })
  console.log(config.data())
}
