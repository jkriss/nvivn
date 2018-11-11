#!/usr/bin/env node
const { nvivn } = require('../src/cli')

nvivn().then(result =>
  console.log(typeof result === 'string' ? result : JSON.stringify(result))
)
