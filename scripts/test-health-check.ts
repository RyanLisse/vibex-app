#!/usr/bin/env bun

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

interface TestResult {
  project: string
  success: boolean
  passed: number
  failed: number
  skipped: number
  duration: number
  errors: string[]
}

async function runTestProject(project: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const errors: string[] = []
    let output = ''
    
    const proc = spawn('bun', ['run', 'vitest', 'run', `--project=${project}`, '--reporter=json'], {
      cwd: process.cwd(),
      env: { ...process.env, CI: 'true' },
    })
    
    proc.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    proc.stderr.on('data', (data) => {
      const error = data.toString()
      if (!error.includes('DEPRECATED')) {
        errors.push(error)
      }
    })
    
    proc.on('close', (code) => {
      const duration = Date.now() - startTime
      
      try {
        // Parse last line as JSON
        const lines = output.trim().split('\n')
        const jsonLine = lines[lines.length - 1]
        const result = JSON.parse(jsonLine)
        
        const passed = result.numTotalTests - result.numFailedTests - result.numTodoTests
        
        resolve({
          project,
          success: code === 0,
          passed,
          failed: result.numFailedTests || 0,
          skipped: result.numTodoTests || 0,
          duration,
          errors,
        })
      } catch (e) {
        // Fallback parsing
        const passMatch = output.match(/(\d+) pass/)
        const failMatch = output.match(/(\d+) fail/)
        const skipMatch = output.match(/(\d+) skip/)
        
        resolve({
          project,
          success: code === 0,
          passed: passMatch ? parseInt(passMatch[1]) : 0,
          failed: failMatch ? parseInt(failMatch[1]) : 0,
          skipped: skipMatch ? parseInt(skipMatch[1]) : 0,
          duration,
          errors,
        })
      }
    })
    
    // Timeout after 2 minutes
    setTimeout(() => {
      proc.kill()
      resolve({
        project,
        success: false,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 120000,
        errors: ['Test timeout after 2 minutes'],
      })
    }, 120000)
  })
}

async function checkSkippedTests() {
  const testFiles = [
    'tests/integration/electric/electric-sync.test.ts',
    'tests/integration/performance/performance-monitoring.test.ts',
    'tests/integration/database/migration-system.test.ts',
    'tests/integration/database/database-operations.test.ts',
    'tests/integration/database/data-integrity.test.ts',
    'db/schema.test.ts',
  ]
  
  const skippedFiles: string[] = []
  
  for (const file of testFiles) {
    try {
      const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8')
      if (content.match(/\.skip\(|describe\.skip|it\.skip|test\.skip/)) {
        skippedFiles.push(file)
      }
    } catch (e) {
      // File doesn't exist
    }
  }
  
  return skippedFiles
}

async function main() {
  console.log('🏥 Test Framework Health Check\n')
  
  // Check for skipped tests
  console.log('📋 Checking for skipped tests...')
  const skippedFiles = await checkSkippedTests()
  
  if (skippedFiles.length > 0) {
    console.log(`❌ Found ${skippedFiles.length} files with skipped tests:`)
    skippedFiles.forEach(file => console.log(`   - ${file}`))
  } else {
    console.log('✅ No skipped tests found!')
  }
  
  console.log('\n🧪 Running test projects...\n')
  
  const projects = ['unit', 'components', 'integration']
  const results: TestResult[] = []
  
  for (const project of projects) {
    console.log(`Running ${project} tests...`)
    const result = await runTestProject(project)
    results.push(result)
    
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${project}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped (${(result.duration / 1000).toFixed(1)}s)`)
    
    if (result.errors.length > 0) {
      console.log(`   Errors:`)
      result.errors.forEach(error => console.log(`   - ${error.trim()}`))
    }
  }
  
  // Summary
  console.log('\n📊 Summary:')
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  console.log(`   Total tests: ${totalPassed + totalFailed + totalSkipped}`)
  console.log(`   ✅ Passed: ${totalPassed}`)
  console.log(`   ❌ Failed: ${totalFailed}`)
  console.log(`   ⏭️  Skipped: ${totalSkipped}`)
  console.log(`   ⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  
  // Configuration status
  console.log('\n🔧 Configuration Status:')
  const configs = [
    'vitest.config.ts',
    'vitest.components.config.ts',
    'vitest.integration.config.ts',
    'vitest.browser.config.ts',
    'vitest.shared.config.ts',
    'vitest.workspace.ts',
  ]
  
  for (const config of configs) {
    try {
      await fs.access(path.join(process.cwd(), config))
      console.log(`   ✅ ${config}`)
    } catch {
      console.log(`   ❌ ${config} (missing)`)
    }
  }
  
  // Recommendations
  if (totalFailed > 0 || totalSkipped > 0) {
    console.log('\n💡 Recommendations:')
    if (totalFailed > 0) {
      console.log('   - Fix failing tests by running: bun run test:all --reporter=verbose')
    }
    if (totalSkipped > 0) {
      console.log('   - Review skipped tests and enable them when ready')
    }
  } else {
    console.log('\n🎉 All tests are passing with zero skipped tests!')
  }
}

main().catch((error) => {
  console.error('Health check failed:', error)
  process.exit(1)
})