#!/usr/bin/env node
const greenlock = require('greenlock-express')
const setup = require('../util/setup')
const createHttpServer = require('./http')

const create = async () => {
  const { config, server } = await setup()
  if (config.info && config.info.greeting) console.log(config.info.greeting)
  const app = createHttpServer({ server }).handler
  const letsencryptOpts = config.letsencrypt
  if (!letsencryptOpts)
    throw new Error('Must provide letsencrypt options in the nvivn config file')
  const defaultOpts = {
    version: 'draft-11',
    server:
      process.env.NODE_ENV === 'staging'
        ? 'https://acme-staging-v02.api.letsencrypt.org/directory'
        : 'https://acme-v02.api.letsencrypt.org/directory',
    configDir: '~/.nvivn/acme/',
    app,
    debug: process.env.NODE_ENV === 'staging',
  }
  greenlock.create(Object.assign(defaultOpts, letsencryptOpts)).listen(80, 443)

  // TODO use those same certs to start up a secure TCP server
}

create().catch(console.error)
