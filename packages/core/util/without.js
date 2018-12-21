const without = (obj, ...fields) => {
  const copy = Object.assign({}, obj)
  fields.forEach(f => delete copy[f])
  return copy
}

module.exports = without
