const list = (q, opts = {}) => {
  if (opts.messageStore) {
    return opts.messageStore.filter(q)
  }
}

module.exports = list
