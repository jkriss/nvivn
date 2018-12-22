const debug = require('debug')('nvivn:plugins:http-server')
const createServer = require('../http')

const serverPlugin = ({ port } = {}) => {
  if (!port) port = process.env.PORT || 3000
  const setup = hub => {
    hub.server = () => {
      debug('-- starting hub server --')
      const { listen } = createServer(hub)
      listen(port).then(({ port }) =>
        console.log(`Listening at http://localhost:${port}`)
      )
      // leave this running
      return new Promise(() => {})
    }
  }
  return {
    setup,
  }
}

module.exports = serverPlugin
