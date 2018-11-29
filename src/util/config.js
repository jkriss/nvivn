require('dotenv').config()
const yaml = require('js-yaml')
const fm = require('front-matter')
const fs = require('fs-extra')
const path = require('path')
const userHome = require('user-home')
const { decode } = require('./encoding')

const findInfo = async (filename = '.nvivn') => {
  const paths = ['.', userHome]
  for (const p of paths) {
    const filepath = path.join(p, '.nvivn')
    const exists = await fs.exists(filepath)
    if (exists) return filepath
  }
}

const loadInfo = async filename => {
  if (!filename) filename = await findInfo()
  let config = {}
  try {
    const infoString = fs.readFileSync(filename, 'utf8')
    frontMattered = fm(infoString)
    let attributes = frontMattered.attributes
    if (
      Object.keys(attributes).length == 0 &&
      frontMattered.body.trim().length > 0
    ) {
      config = yaml.safeLoad(frontMattered.body)
    } else {
      config = frontMattered.attributes
      if (!config.info) config.info = {}
      config.info.greeting = frontMattered.body
    }
  } catch (err) {
    console.error(err)
  }
  if (!config.keys) {
    config.keys = {}
    if (process.env.NVIVN_PUBLIC_KEY)
      config.keys.publicKey = decode(process.env.NVIVN_PUBLIC_KEY)
    if (process.env.NVIVN_SECRET_KEY)
      config.keys.secretKey = decode(process.env.NVIVN_SECRET_KEY)
  }
  return config
}

module.exports = loadInfo

if (require.main === module) {
  loadInfo().then(console.log)
}
