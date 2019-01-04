const { encode, decode } = require('../nvivn-multipart')
const { Streamer } = require('../multipart')
const serial = require('./serial')
const sleep = require('await-sleep')

const html = `
  <input type="button" id="connect" value="Connect">
  <form id="form">
    <input style="width:200px" type="text">
    <input type="submit">
  </form>
  <pre id="result"></pre>
`

document.body.innerHTML = html

const form = document.getElementById('form')
const input = document.querySelector('#form input[type=text]')
const resultEl = document.getElementById('result')
input.value = JSON.stringify({
  t: Date.now(),
  body: 'Hello there!',
})

let textEncoder = new TextEncoder()

form.onsubmit = evt => {
  evt.preventDefault()
  const rawValue = input.value
  let value = rawValue
  try {
    // value = JSON.parse(rawValue)
    value = eval(`(${rawValue})`)
  } catch (err) {}
  console.log('will send:', value)
  const parts = encode(value)
  // console.log("packets:", parts.map(buf2hex))

  const lineBreak = Buffer.from('\n')
  const delay = 1

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
      for (const part of parts) {
        // console.log("sending", buf2hex(part))
        const b64 = Buffer.from(part).toString('base64')
        console.log('> sending', b64)
        await port.send(textEncoder.encode(b64)).then(async () => {
          await sleep(delay)
          // add the line break
          // console.log("sending", buf2hex(lineBreak))
          // console.log("  line break")
          return port.send(lineBreak)
        })
        await sleep(delay)
      }
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
  resultEl.innerText = JSON.stringify(obj, null, 2)
  console.log('total size:', JSON.stringify(obj).length)
  streamer.reset()
}

document.addEventListener('DOMContentLoaded', event => {
  let connectButton = document.querySelector('#connect')

  function connect() {
    console.log('Connecting to ' + port.device_.productName + '...')
    port.connect().then(
      () => {
        console.log(port)
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
          }

          // console.log("data:", data)
          // if (text === '\n') {
          //   console.log("<< buffered data:", inputBuffer)
          //   if (inputBuffer.includes(' ')) {
          //     // this is a command, don't process input
          //   } else {
          //     streamer.write(Buffer.from(inputBuffer, 'base64'))
          //   }
          //   inputBuffer = ''
          // } else {
          //   inputBuffer += text
          // }
          // const val = data.getInt8(0)
          // // console.log("val:", val)
          // if (val === 10) {
          //   console.log("buffered data:", Buffer.from(inputBuffer).toString('base64'))
          //   inputBuffer = []
          // } else {
          //   inputBuffer.push(val)
          // }
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
      error('No devices found.')
    } else {
      port = ports[0]
      connect()
    }
  })
})
