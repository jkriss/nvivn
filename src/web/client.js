const localforage = require('localforage')
const oyaml = require('oyaml')
const idGenerator = require('../id')
const signing = require('../signing')

const MemoryHub = require('../hub/memory')

module.exports = async function(opts) {

  let config = await localforage.getItem('hubConfig')
  if (!config) {
    config = idGenerator(3)
    console.log("generated config:", config)
    localforage.setItem('hubConfig', config)
  }
  console.log("loaded config for", config.id)

  const hub = new MemoryHub(Object.assign({ messages: opts.messages }, config))
  window.hub = hub
  let host

  const command = function(cmd) {

    if (cmd.startsWith(':')) {
      // these are internal commands
      const internalCmd = oyaml.parse(cmd.slice(1))
      console.log("running internal command", internalCmd)
      if (internalCmd[0] === 'set-host' || internalCmd[0] === 'set-hub') {
        setHost(internalCmd[1])
      } else if (internalCmd === 'set-host' || internalCmd === 'set-hub') {
        host = null
        opts.onData(`back to local hub`)
        opts.onEnd()
      } else {
        opts.onError(`Didn't recognize internal command ${cmd}, ${JSON.stringify(internalCmd)}`)
        opts.onEnd()
      }
      return
    }

    if (!cmd.startsWith('op:')) cmd = 'op:' + cmd

    if (host) {

      const meta = {
        signed: [ { id:config.id, publicKey: config.publicKey, signature: signing.sign(cmd, config.secretKey) }]
      }
      cmd = [cmd, oyaml.stringify(meta)].join(" | ")
      console.log("signed command:", cmd)
      fetch(`${host}/${cmd.replace(/ /g,'_')}`)
        .then(r => r.text())
        .then(text => {
          text.trim().split("\n").forEach(line => opts.onData(line))
          if (opts.onEnd) opts.onEnd()
        })

    } else {
      const [input, output] = hub.getCommandStreams()
      input.write(cmd)
      if (opts.onData) output.on('data', (d) => {
        // ignore the newlines
        if (d.trim() !== '') opts.onData(d)
      })
      if (opts.onError) output.on('error', opts.onError)
      if (opts.onEnd) output.on('finish', opts.onEnd)
      input.end()
    }

  }

  const setHost = (url) => {
    if (!url.startsWith('http')) url = `http://${url}`
    console.log("setting host to", url)
    // try to reach the host
    fetch(url + '/peers')
      .then(r => {
        console.log("response:", r)
        if (r.status !== 200) {
          opts.onError(`Error reaching ${url}/peers: ${r.status}`)
        } else {
          return r.text()
        }
      })
      .then(body => {
        console.log("got body:", body)
        host = url
        opts.onData(`host now ${host}`)
        opts.onEnd()
      })
      .catch(err => {
        opts.onError(`Error reaching ${url}/peers: ${err}`)
      })
  }

  return { command, setHost }

}

// init()
