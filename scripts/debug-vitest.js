#!/usr/bin/env node

const { spawn } = require('node:child_process')

const child = spawn(
  'node',
  [
    '--trace-warnings',
    '--trace-uncaught',
    'node_modules/vitest/dist/cli.js',
    'run',
    '--config',
    'vitest.config.minimal.ts',
    '--reporter=verbose',
    '--no-coverage',
  ],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DEBUG: 'vitest:*',
    },
  }
)

// Kill after 10 seconds
setTimeout(() => {
  child.kill('SIGKILL')
  process.exit(1)
}, 10_000)

child.on('exit', (code) => {
  process.exit(code || 0)
})
