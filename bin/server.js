#!/usr/bin/env node
const micro = require('micro')
const handler = require('../src/web/index')

const PORT = process.env.PORT || 3000
const server = micro(handler)
server.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`))
