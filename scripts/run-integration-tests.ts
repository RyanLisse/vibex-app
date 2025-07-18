#!/usr/bin/env bun

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

async function runIntegrationTests() {
  console.log('Starting integration tests...')

  const testFiles = [
    'tests/integration/basic.test.ts',
    'tests/integration/inngest-simple-mock.test.ts',
    'tests/integration/inngest-mock-validation.test.ts',
  ]

  for (const testFile of testFiles) {
    console.log(`\n🧪 Running ${testFile}...`)

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          'bunx',
          ['vitest', 'run', testFile, '--config=vitest.integration.config.ts'],
          {
            stdio: 'inherit',
            cwd: process.cwd(),
            timeout: 30000, // 30 second timeout
          }
        )

        child.on('exit', (code) => {
          if (code === 0) {
            console.log(`✅ ${testFile} passed`)
            resolve()
          } else {
            console.log(`❌ ${testFile} failed with code ${code}`)
            reject(new Error(`Test failed: ${testFile}`))
          }
        })

        child.on('error', (error) => {
          console.error(`Error running ${testFile}:`, error)
          reject(error)
        })

        // Kill the process if it takes too long
        setTimeout(() => {
          child.kill('SIGTERM')
          reject(new Error(`Timeout running ${testFile}`))
        }, 30000)
      })
    } catch (error) {
      console.error(`Failed to run ${testFile}:`, error)
      // Continue with other tests
    }
  }

  console.log('\n✨ Integration test run complete!')
}

runIntegrationTests().catch(console.error)
