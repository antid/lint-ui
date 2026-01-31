#!/usr/bin/env node
// Used during development: node ./bin/dev.js <command>
const oclif = require('@oclif/core')

const path = require('path')
const project = path.join(__dirname, '..', 'tsconfig.json')

// In dev mode we need to load from src
require('ts-node').register({project})

oclif.run().then(require('@oclif/core/flush')).catch(require('@oclif/core/handle'))
