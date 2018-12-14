const fs = require('fs-extra')

const findFile = async ({ basename, extensions = [] }) => {
  const baseExists = await fs.exists(basename)
  if (baseExists) return basename
  for (const ext of extensions) {
    const filename = `${basename}.${ext.replace(/^\./, '')}`
    const extExists = await fs.exists(filename)
    if (extExists) return filename
  }
  return null
}

module.exports = findFile
