const yaml = require('js-yaml')
const fm = require('front-matter')

module.exports = () => {
  let info = {}
  try {
    const infoString = fs.readFileSync('.nvivn', 'utf8')
    frontMattered = fm(infoString)
    let attributes = frontMattered.attributes
    if (
      Object.keys(attributes).length == 0 &&
      frontMattered.body.trim().length > 0
    ) {
      info = yaml.safeLoad(frontMattered.body)
    } else {
      info = Object.assign({}, frontMattered.attributes, {
        greeting: frontMattered.body,
      })
    }
  } catch (err) {}
  return info
}
