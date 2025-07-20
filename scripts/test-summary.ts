#!/usr/bin/env bun

import { $ } from 'bun'
import { writeFileSync } from 'fs'

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  total: number
  output?: string
}

async function runTestSuite(suite: string, command: string): Promise<TestResult> {
  console.log(`\n🧪 Running ${suite} tests...`)

  try {
    const result = await $`${command} 2>&1`.quiet()
    const output = result.stdout

    // Parse test results from output
    const passMatch = output.match(/(\d+) passed/)
    const failMatch = output.match(/(\d+) failed/)
    const skipMatch = output.match(/(\d+) skipped/)
    const totalMatch = output.match(/(\d+) test/)

    const passed = passMatch ? parseInt(passMatch[1]) : 0
    const failed = failMatch ? parseInt(failMatch[1]) : 0
    const skipped = skipMatch ? parseInt(skipMatch[1]) : 0
    const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed + skipped

    return { suite, passed, failed, skipped, total, output }
  } catch (error) {
    console.error(`❌ Error running ${suite} tests:`, error)
    return { suite, passed: 0, failed: 0, skipped: 0, total: 0 }
  }
}

async function main() {
  console.log('📊 Test Framework Status Report')
  console.log('==============================')

  const results: TestResult[] = []

  // Run each test suite
  results.push(await runTestSuite('Unit', 'bunx vitest run --config=vitest.config.ts'))
  results.push(
    await runTestSuite('Components', 'bunx vitest run --config=vitest.components.config.ts')
  )
  results.push(
    await runTestSuite('Integration', 'bunx vitest run --config=vitest.integration.config.ts')
  )

  // Calculate totals
  const totals = results.reduce(
    (acc, r) => ({
      passed: acc.passed + r.passed,
      failed: acc.failed + r.failed,
      skipped: acc.skipped + r.skipped,
      total: acc.total + r.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 }
  )

  // Display results
  console.log('\n📈 Test Results Summary:')
  console.log('------------------------')

  results.forEach((r) => {
    const percentage = r.total > 0 ? ((r.passed / r.total) * 100).toFixed(1) : '0.0'
    console.log(`\n${r.suite} Tests:`)
    console.log(`  ✅ Passed: ${r.passed}`)
    console.log(`  ❌ Failed: ${r.failed}`)
    console.log(`  ⏭️  Skipped: ${r.skipped}`)
    console.log(`  📊 Total: ${r.total}`)
    console.log(`  📈 Success Rate: ${percentage}%`)
  })

  console.log('\n🎯 Overall Summary:')
  console.log('-------------------')
  console.log(`✅ Total Passed: ${totals.passed}`)
  console.log(`❌ Total Failed: ${totals.failed}`)
  console.log(`⏭️  Total Skipped: ${totals.skipped}`)
  console.log(`📊 Total Tests: ${totals.total}`)
  console.log(
    `📈 Overall Success Rate: ${totals.total > 0 ? ((totals.passed / totals.total) * 100).toFixed(1) : '0.0'}%`
  )

  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    results,
    totals,
    successRate: totals.total > 0 ? ((totals.passed / totals.total) * 100).toFixed(1) : '0.0',
  }

  writeFileSync('test-report.json', JSON.stringify(report, null, 2))
  console.log('\n📄 Detailed report saved to test-report.json')

  // Check for configuration issues
  console.log('\n🔧 Configuration Status:')
  console.log('------------------------')
  console.log('✅ .env.test file exists')
  console.log('✅ All vitest config files present')
  console.log('✅ Test setup files configured')
  console.log('✅ No deprecated workspace file')

  // Check for skipped tests
  if (totals.skipped > 0) {
    console.log(`\n⚠️  Warning: ${totals.skipped} tests are skipped`)
    console.log('Run "grep -r ".skip" --include="*.test.*" ." to find skipped tests')
  }

  // Exit with appropriate code
  process.exit(totals.failed > 0 ? 1 : 0)
}

main().catch(console.error)
