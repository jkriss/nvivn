const debug = require('debug')('nvivn:plugins:http-server')
const createServer = require('../http')

const serverPlugin = ({ port } = {}) => {
  if (!port) port = process.env.PORT || 3000
  const setup = hub => {
    hub.server = () => {
      const { listen } = createServer(hub)
      return listen(port).then(({ port }) =>
        console.log(`Listening at http://localhost:${port}`)
      )
    }
  }
  return {
    setup,
  }
}

module.exports = serverPlugin
