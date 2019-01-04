const { encode, decode } = require('../nvivn-multipart')
const { Streamer } = require('../multipart')
const serial = require('./serial')
const sleep = require('await-sleep')

const html = `
  <input type="button" id="connect" value="Connect">
  <input type="button" id="receive" value="Receive">
  <input type="button" id="cancel" value="Cancel">
  <form id="form">
    <input style="width:200px" type="text">
    <input type="submit">
  </form>
  <pre id="status">
  </pre>
  <pre id="result"></pre>
`

document.body.innerHTML = html

const form = document.getElementById('form')
const input = document.querySelector('#form input[type=text]')
const resultEl = document.getElementById('result')
const statusEl = document.getElementById('status')
const receiveBtn = document.getElementById('receive')
const cancelBtn = document.getElementById('cancel')

function receiveFor(seconds) {
  if (!port) {
    alert('No device connected')
  }
  const rxCommand = textEncoder.encode(`rx ${seconds}\n`)
  console.log('> sending', Buffer.from(rxCommand).toString())
  port.send(rxCommand).catch(error => {
    handleError('Send error: ' + error)
  })
}

receiveBtn.addEventListener('click', () => receiveFor(0))

cancelBtn.addEventListener('click', cancel)

// input.value = JSON.stringify({
//   t: Date.now(),
//   body: 'Hello there!',
// })

let textEncoder = new TextEncoder()

function cancel() {
  const cancelCommand = textEncoder.encode(`ca 0\n`)
  console.log('> sending', Buffer.from(cancelCommand).toString())
  port.send(cancelCommand).catch(error => {
    handleError('Send error: ' + error)
  })
}

form.onsubmit = evt => {
  evt.preventDefault()
  const rawValue = input.value
  let value = { body: rawValue }
  try {
    // value = JSON.parse(rawValue)
    value = eval(`(${rawValue})`)
  } catch (err) {}
  console.log('will send:', value)
  const parts = encode(value)
  // console.log("packets:", parts.map(buf2hex))

  const lineBreak = Buffer.from('\n')
  const delay = 200

  // tell it we're going to start sending
  const txCommand = textEncoder.encode(`tx ${parts.length}\n`)
  console.log('> sending', Buffer.from(txCommand).toString())
  port
    .send(txCommand)
    .catch(error => {
      handleError('Send error: ' + error)
    })
    .then(async () => {
      await sleep(delay)
      for (const idx in parts) {
        const part = parts[idx]
        // console.log("sending", buf2hex(part))
        const b64 = Buffer.from(part).toString('base64')
        console.log('> sending', b64)
        await port.send(textEncoder.encode(b64)).then(async () => {
          await sleep(delay)
          // add the line break
          // console.log("sending", buf2hex(lineBreak))
          // console.log("  line break")
          statusEl.innerText = `Sending part ${parseInt(idx) + 1} of ${
            parts.length
          }`
          return port.send(lineBreak)
        })
        await sleep(delay)
      }
      console.log('back to receiving...')
      statusEl.innerText = ''
      receiveFor(0)
    })

  // const decoded = decode(parts)
  // console.log("let's pretend we got it back:", decoded)
}

// set up the usb connection business

const handleError = function(err) {
  console.error('error:', err)
}

let port

function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('')
}

let inputBuffer = ''
const streamer = new Streamer()

streamer.onComplete = parts => {
  const obj = decode(parts)
  console.log(`!! received multipart data in ${parts.length} parts:`, obj)
  cancel()
  receiveFor(0)
  resultEl.innerText = JSON.stringify(obj, null, 2)
  console.log('total size:', JSON.stringify(obj).length)
  statusEl.innerText = ''
  streamer.reset()
}

document.addEventListener('DOMContentLoaded', event => {
  let connectButton = document.querySelector('#connect')

  function connect() {
    console.log('Connecting to ' + port.device_.productName + '...')
    return port.connect().then(
      () => {
        console.log('connected to:', port)

        // auto recieve for a bit
        console.log('starting to receive...')
        receiveFor(0)

        connectButton.textContent = 'Disconnect'
        port.onReceive = data => {
          // this is one part of many, potentially,
          // buffer it until we're done, then decode
          // console.log("- got data:", buf2hex(data.buffer))
          let textDecoder = new TextDecoder()
          const text = textDecoder.decode(data)
          console.log('< recieved:', text) //, buf2hex(data.buffer))

          if (text.includes(' ')) {
            // this is a command, don't process input
          } else {
            streamer.write(Buffer.from(text, 'base64'))
            if (streamer.expectedLength) {
              statusEl.innerText = `Received part ${streamer.parts.length} of ${
                streamer.expectedLength
              }`
            }
          }
        }
        port.onReceiveError = error => {
          handleError('Receive error: ' + error)
        }
      },
      error => {
        handleError('Connection error: ' + error)
      }
    )
  }

  connectButton.addEventListener('click', function() {
    if (port) {
      port.disconnect()
      connectButton.textContent = 'Connect'
      port = null
    } else {
      serial
        .requestPort()
        .then(selectedPort => {
          port = selectedPort
          connect()
        })
        .catch(error => {
          handleError('Connection error: ' + error)
        })
    }
  })

  serial.getPorts().then(ports => {
    if (ports.length == 0) {
      handleError('No devices found.')
    } else {
      port = ports[0]
      connect()
    }
  })
})
