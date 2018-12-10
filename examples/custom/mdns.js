const debug = require('debug')('nvivn:custom:mdns')
const bonjour = require('bonjour')()
const url = require('url')

let settings

module.exports = {
  ready: server => {
    settings = server.config.data()
    server.on('settingsChange', s => (settings = s))
    console.log('started server with:', settings.info)
    const serverUrl = url.parse(settings.info.connect.url)
    const bonjourInfo = {
      // name: settings.info.id,
      name: settings.info.id
        .split('.')
        .slice(0, -1)
        .join('-'),
      // name: settings.info.id.replace(/\./,'-'),
      host: serverUrl.hostname,
      port: serverUrl.port,
      // type: serverUrl.protocol.replace(':',''),
      // type: 'nvivn',
      type: 'http',
      // subtypes: [serverUrl.protocol.replace(':','')],
      txt: {
        key: settings.keys.publicKey,
        id: settings.info.id,
      },
    }
    if (settings.info.operator && settings.info.operator.publicKey) {
      bonjourInfo.txt.operatorPublicKey = settings.info.operator.publicKey
    }
    debug('broadcasting info', bonjourInfo)
    bonjour.publish(bonjourInfo)
    const addService = function(service) {
      debug('Found an HTTP server:', service)
      const trustedKeys = server.getTrustedKeys()
      if (service.txt.key) {
        debug('...seeing if we know about public key', service.txt.key)
        let peerFound = false
        if (service.txt.id === settings.info.id) {
          debug("oh cool that's this server")
        } else if (trustedKeys.includes(service.txt.key)) {
          debug('!! found trusted peer', service.txt.key)
          peerFound = true
        } else if (settings.peers) {
          const peer = settings.peers.find(p => p.publicKey === service.txt.key)
          if (peer) {
            debug('!! found peer', peer.publicKey)
            peerFound = true
          }
        }

        if (peerFound) {
          const url = `${service.type}://${service.host}:${service.port}`
          debug('registering', url)
          server.client.setPeerUrl({
            publicKey: service.txt.key,
            id: service.txt.id,
            url,
          })
        }
      }
    }
    let browser = bonjour.find({ type: 'http' }, service => addService(service))

    // do a full rescan every so often to clear bad records
    setInterval(() => {
      browser = bonjour.find({ type: 'http' }, service => addService(service))
      server.client.clearPeerUrls()
    }, 60 * 1000)
    // browser.on('up', addService) // redundant?
    // TODO handle this
    // browser.on('down')
  },
}
