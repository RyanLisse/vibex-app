#!/usr/bin/env bun

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Simple test runner that runs all test files
async function runAllTests() {
  console.log('🧪 Running all tests...\n')

  const testPatterns = [
    // Unit tests
    'lib/**/*.test.{js,ts}',
    'src/lib/**/*.test.{js,ts}',
    'src/schemas/**/*.test.{js,ts}',
    'src/shared/**/*.test.{js,ts}',
    'src/features/**/*.test.{js,ts}',
    'src/types/**/*.test.{js,ts}',
    'stores/**/*.test.{js,ts}',

    // Component tests
    'components/**/*.test.{js,ts,jsx,tsx}',
    'hooks/**/*.test.{js,ts,jsx,tsx}',
    'app/**/*.test.{js,ts,jsx,tsx}',

    // Integration tests
    'tests/integration/**/*.test.{js,ts,jsx,tsx}',
    'app/api/**/*.test.{js,ts}',
    '**/*.integration.test.*',

    // E2E tests (excluding for now as they need playwright)
    // 'tests/e2e/**/*.spec.{js,ts,jsx,tsx}',
  ]

  let totalPassed = 0
  let totalFailed = 0
  let failedTests: string[] = []

  for (const pattern of testPatterns) {
    try {
      console.log(`\n📁 Running tests matching: ${pattern}`)
      const result = execSync(`bun test ${pattern} --timeout=15000`, {
        encoding: 'utf8',
        stdio: 'pipe',
      })

      // Parse results
      const passMatch = result.match(/(\d+) pass/)
      const failMatch = result.match(/(\d+) fail/)

      if (passMatch) {
        totalPassed += parseInt(passMatch[1])
      }
      if (failMatch && parseInt(failMatch[1]) > 0) {
        totalFailed += parseInt(failMatch[1])
        failedTests.push(pattern)
      }

      console.log(result)
    } catch (error: any) {
      // Test failures will throw
      if (error.stdout) {
        console.log(error.stdout)

        const passMatch = error.stdout.match(/(\d+) pass/)
        const failMatch = error.stdout.match(/(\d+) fail/)

        if (passMatch) {
          totalPassed += parseInt(passMatch[1])
        }
        if (failMatch) {
          totalFailed += parseInt(failMatch[1])
          failedTests.push(pattern)
        }
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${totalPassed}`)
  console.log(`❌ Failed: ${totalFailed}`)
  console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)

  if (failedTests.length > 0) {
    console.log('\n⚠️  Failed test patterns:')
    failedTests.forEach((pattern) => console.log(`  - ${pattern}`))
  }

  console.log('\n' + '='.repeat(60))

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0)
}

runAllTests().catch(console.error)
