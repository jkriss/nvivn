const filtrex = require('filtrex')
const datemath = require('datemath-parser').parse
const parseDate = require('./timestamp').parse
const { getValue } = require('./label-value')

const allowAll = () => 1

const customFunctions = { value: getValue, datemath, date: parseDate }

module.exports = function({ body, meta }) {
  const bodyFilter = body ? filtrex(body, customFunctions) : allowAll
  const metaFilter = meta ? filtrex(meta, customFunctions) : allowAll
  return ({ body, meta }) => {
    // console.log("filtering:", body)
    // console.log("filter result:", bodyFilter(body) === 1 && metaFilter(meta))
    return bodyFilter(body) === 1 && metaFilter(meta)
  }
}