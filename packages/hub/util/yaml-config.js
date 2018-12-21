const yaml = require('js-yaml')
const fm = require('front-matter')

const yamlConfig = str => {
  const front = fm(str)
  let obj = front.attributes
  if (Object.keys(obj).length == 0 && front.body.trim().length > 0) {
    obj = yaml.safeLoad(front.body)
  } else {
    if (!obj.info) obj.info = {}
    obj.info.greeting = front.body
  }
  return obj
}

module.exports = yamlConfig
