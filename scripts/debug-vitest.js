#!/usr/bin/env node

const { spawn } = require('child_process')

console.log('Starting vitest debug...')
console.log('Node version:', process.version)
console.log('Working directory:', process.cwd())
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  CI: process.env.CI,
})

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
  console.error('\n\n❌ Vitest hung for 10 seconds, killing process...')
  child.kill('SIGKILL')
  process.exit(1)
}, 10_000)

child.on('exit', (code) => {
  console.log('\nVitest exited with code:', code)
  process.exit(code || 0)
})
