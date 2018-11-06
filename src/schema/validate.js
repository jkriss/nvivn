const Ajv = require('ajv')
const fs = require('fs-extra')
const path = require('path')

let ajv

const loadSchemas = async () => {
  if (!ajv) {
    const schemas = []
    for (const type of ['common', 'commands/post', 'message']) {
      const schema = await fs.readJSON(path.join(__dirname, '..', 'schema', `${type}.json`))
      schemas.push(schema)
    }
    // console.log("loaded schemas:", schemas)
    ajv = new Ajv({ schemas })
  }
  return ajv
}

const validate = async (type, data) => {
  // const schema = await fs.readJSON(path.join(__dirname, '..', 'schema', `${type}.json`))
  const ajv = await loadSchemas()
  try {
    const validate = ajv.getSchema(`https://nvivn.io/${type}.schema.json`)
    // var validate = ajv.compile(schema)
    var valid = validate(data)
    if (!valid) console.log(validate.errors)
    return valid
  } catch (err) {
    console.error(err)
  }
}

validate('post', { message: 'hi there!' })
validate('post', { message: 'hi there!', format: 'json' })
validate('post', { message: 'hi there!', type: 'broadcast' })
validate('message', {"body":"hi","type":"message","meta":{"t":1541532807054,"hash":"mEg9oaTE1NDE1MzI4MDcwNTQ"}})
validate('message', {"body":"hi","type":"message","meta":{"t":1541533010154,"signed":[{"publicKey":"ZeqfmS4f5GpWcf5VRiu6weXS3SR7VzX1XDs8HEqa5bEXT","signature":"ZP8TfhVzJcuQ1qEoENewE1KZUd6Jr99w9rmykrwDxMsEFVtqWhYCpJzhmWi7phTdqd792mU1Vbpvy53VqCvyQ3t9"}],"route":[{"publicKey":"ZeqfmS4f5GpWcf5VRiu6weXS3SR7VzX1XDs8HEqa5bEXT","t":1541533010159}],"hash":"mEiBoaTE1NDE1MzMwMTAxNTR2aXRpcy1qb3NvZC1qaWdhYg"},"from":"vitis-josod-jigab"})
