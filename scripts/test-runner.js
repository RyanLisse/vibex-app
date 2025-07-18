#!/usr/bin/env node

/**
 * Test runner script that ensures proper cleanup and prevents hanging
 */

const { spawn } = require('child_process')
const path = require('path')

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.TZ = 'UTC'

// Vitest arguments
const args = process.argv.slice(2)

// Add default arguments for better test execution
const vitestArgs = ['vitest', '--run', '--reporter=basic', ...args]

console.log('Running tests with vitest...')
console.log('Command:', 'bunx', vitestArgs.join(' '))

const child = spawn('bunx', vitestArgs, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
})

// Handle process termination
let isExiting = false

function cleanup(code = 0) {
  if (isExiting) return
  isExiting = true

  console.log('\nCleaning up test environment...')

  // Kill the child process if it's still running
  if (!child.killed) {
    child.kill('SIGTERM')

    // Force kill after 5 seconds if needed
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
    }, 5000)
  }

  // Exit with the appropriate code
  setTimeout(() => {
    process.exit(code)
  }, 100)
}

// Set up termination handlers
process.on('SIGINT', () => cleanup(130))
process.on('SIGTERM', () => cleanup(143))
process.on('exit', cleanup)

// Handle child process events
child.on('close', (code) => {
  cleanup(code || 0)
})

child.on('error', (err) => {
  console.error('Failed to start test runner:', err)
  cleanup(1)
})

// Set a hard timeout to prevent hanging forever
const TIMEOUT = 5 * 60 * 1000 // 5 minutes
setTimeout(() => {
  console.error('\n⚠️  Tests timed out after 5 minutes!')
  cleanup(1)
}, TIMEOUT)
