#!/usr/bin/env bun

/**
 * CI/CD Integration Validation Script
 *
 * Comprehensive validation of the testing framework for CI/CD environments
 */

import { spawn, type SpawnOptions } from 'bun'
import { existsSync, statSync } from 'fs'
import { join } from 'path'

interface TestResult {
  name: string
  command: string
  duration: number
  success: boolean
  output: string
  errors?: string[]
}

interface ValidationReport {
  timestamp: string
  environment: {
    bun: string
    node: string
    typescript: string
    platform: string
  }
  tests: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    totalDuration: number
  }
  ciReadiness: {
    ready: boolean
    issues: string[]
    recommendations: string[]
  }
}

class CICDValidator {
  private results: TestResult[] = []
  private startTime = Date.now()

  constructor(private verbose = false) {}

  private log(message: string, level: 'info' | 'error' | 'success' | 'warn' = 'info') {
    if (!this.verbose && level !== 'error') return

    const prefix = {
      info: '📋',
      error: '❌',
      success: '✅',
      warn: '⚠️ ',
    }[level]

    console.log(`${prefix} ${message}`)
  }

  private async runCommand(
    name: string,
    command: string,
    args: string[] = [],
    options: SpawnOptions = {}
  ): Promise<TestResult> {
    const startTime = Date.now()
    this.log(`Running: ${name}`)

    try {
      const proc = spawn({
        cmd: [command, ...args],
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
        ...options,
      })

      const output = await new Response(proc.stdout).text()
      const errors = await new Response(proc.stderr).text()

      await proc.exited
      const duration = Date.now() - startTime
      const success = proc.exitCode === 0

      const result: TestResult = {
        name,
        command: `${command} ${args.join(' ')}`,
        duration,
        success,
        output,
        errors: errors ? [errors] : undefined,
      }

      this.results.push(result)
      this.log(
        `${name}: ${success ? 'PASSED' : 'FAILED'} (${duration}ms)`,
        success ? 'success' : 'error'
      )

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const result: TestResult = {
        name,
        command: `${command} ${args.join(' ')}`,
        duration,
        success: false,
        output: '',
        errors: [String(error)],
      }

      this.results.push(result)
      this.log(`${name}: ERROR (${duration}ms)`, 'error')
      return result
    }
  }

  private async checkEnvironment(): Promise<Record<string, string>> {
    this.log('Checking environment...')

    const env = {
      bun: '',
      node: '',
      typescript: '',
      platform: process.platform,
    }

    try {
      const bunProc = spawn({ cmd: ['bun', '--version'], stdout: 'pipe' })
      env.bun = (await new Response(bunProc.stdout).text()).trim()
    } catch (e) {
      env.bun = 'not found'
    }

    try {
      const nodeProc = spawn({ cmd: ['node', '--version'], stdout: 'pipe' })
      env.node = (await new Response(nodeProc.stdout).text()).trim()
    } catch (e) {
      env.node = 'not found'
    }

    try {
      const tscProc = spawn({ cmd: ['bunx', 'tsc', '--version'], stdout: 'pipe' })
      env.typescript = (await new Response(tscProc.stdout).text()).trim()
    } catch (e) {
      env.typescript = 'not found'
    }

    return env
  }

  private async validatePackageScripts(): Promise<void> {
    this.log('Validating package.json test scripts...')

    const packageJsonPath = join(process.cwd(), 'package.json')
    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found')
    }

    const packageJson = await Bun.file(packageJsonPath).json()
    const scripts = packageJson.scripts || {}

    const requiredScripts = [
      'test',
      'test:unit',
      'test:integration',
      'test:coverage',
      'typecheck',
      'lint',
    ]

    const missingScripts = requiredScripts.filter((script) => !scripts[script])
    if (missingScripts.length > 0) {
      this.log(`Missing required scripts: ${missingScripts.join(', ')}`, 'warn')
    }
  }

  private async validateTestTimeout(): Promise<void> {
    this.log('Testing command timeouts...')

    // Test a command that should complete quickly
    const quickTest = await this.runCommand('Quick Test', 'bun', ['--version'])

    if (quickTest.duration > 5000) {
      this.log('Command execution is slower than expected', 'warn')
    }
  }

  async validate(): Promise<ValidationReport> {
    this.log('Starting CI/CD Integration Validation...', 'info')
    this.startTime = Date.now()

    // Environment check
    const environment = await this.checkEnvironment()

    // Package validation
    await this.validatePackageScripts()

    // Test timeouts
    await this.validateTestTimeout()

    // Core tests
    await this.runCommand('Install Dependencies', 'bun', ['install'])

    await this.runCommand('Type Check', 'bun', ['run', 'typecheck'])

    // Unit tests (should be fast and reliable)
    await this.runCommand('Unit Tests', 'bun', ['run', 'test:unit:logic'])

    // Try component tests (may fail due to config issues)
    await this.runCommand('Component Tests', 'bun', ['run', 'test:components'])

    // Try integration tests with timeout
    await this.runCommand('Integration Tests (Limited)', 'bun', [
      'test',
      '--timeout=5000',
      'tests/integration/basic.test.ts',
    ])

    // Test linting
    await this.runCommand('Lint Check', 'bun', ['run', 'lint'])

    // Security audit
    await this.runCommand('Security Audit', 'bun', ['audit'])

    const totalDuration = Date.now() - this.startTime
    const passed = this.results.filter((r) => r.success).length
    const failed = this.results.filter((r) => !r.success).length

    // Generate CI/CD readiness assessment
    const issues: string[] = []
    const recommendations: string[] = []

    // Check critical failures
    const criticalTests = ['Install Dependencies', 'Type Check', 'Unit Tests']
    const criticalFailures = this.results.filter(
      (r) => criticalTests.includes(r.name) && !r.success
    )

    if (criticalFailures.length > 0) {
      issues.push('Critical tests are failing - CI/CD not ready')
      issues.push(...criticalFailures.map((r) => `${r.name}: ${r.errors?.[0] || 'Unknown error'}`))
    }

    // Check performance
    const slowTests = this.results.filter((r) => r.duration > 30000) // 30s
    if (slowTests.length > 0) {
      issues.push('Some tests are running slower than 30 seconds')
      recommendations.push('Optimize slow tests or increase CI timeout limits')
    }

    // Check test coverage
    const hasIntegrationTests = this.results.some(
      (r) => r.name.includes('Integration') && r.success
    )
    if (!hasIntegrationTests) {
      issues.push('Integration tests are not working properly')
      recommendations.push('Fix integration test configuration and hanging issues')
    }

    const hasComponentTests = this.results.some((r) => r.name.includes('Component') && r.success)
    if (!hasComponentTests) {
      issues.push('Component tests are not working properly')
      recommendations.push('Fix Vitest component test configuration')
    }

    // Performance recommendations
    if (totalDuration > 300000) {
      // 5 minutes
      recommendations.push('Total test suite time exceeds 5 minutes - consider parallel execution')
    }

    if (passed === 0) {
      issues.push('No tests are passing - major configuration issues')
    }

    const ready = issues.length === 0 && passed >= failed

    return {
      timestamp: new Date().toISOString(),
      environment,
      tests: this.results,
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped: 0,
        totalDuration,
      },
      ciReadiness: {
        ready,
        issues,
        recommendations,
      },
    }
  }

  async generateReport(): Promise<string> {
    const report = await this.validate()

    let output = `
# CI/CD Integration Validation Report
Generated: ${report.timestamp}

## Environment
- **Bun**: ${report.environment.bun}
- **Node.js**: ${report.environment.node}  
- **TypeScript**: ${report.environment.typescript}
- **Platform**: ${report.environment.platform}

## Test Results Summary
- **Total Tests**: ${report.summary.total}
- **Passed**: ${report.summary.passed} ✅
- **Failed**: ${report.summary.failed} ❌
- **Total Duration**: ${(report.summary.totalDuration / 1000).toFixed(2)}s

## Individual Test Results
`

    for (const test of report.tests) {
      const status = test.success ? '✅ PASS' : '❌ FAIL'
      const duration = `${test.duration}ms`
      output += `
### ${test.name} ${status}
- **Command**: \`${test.command}\`
- **Duration**: ${duration}
`

      if (!test.success && test.errors) {
        output += `- **Errors**:
\`\`\`
${test.errors.join('\n')}
\`\`\`
`
      }
    }

    output += `
## CI/CD Readiness: ${report.ciReadiness.ready ? '✅ READY' : '❌ NOT READY'}

`

    if (report.ciReadiness.issues.length > 0) {
      output += `### Issues to Fix:
${report.ciReadiness.issues.map((issue) => `- ${issue}`).join('\n')}

`
    }

    if (report.ciReadiness.recommendations.length > 0) {
      output += `### Recommendations:
${report.ciReadiness.recommendations.map((rec) => `- ${rec}`).join('\n')}

`
    }

    output += `
## Performance Analysis
- **Fastest Test**: ${Math.min(...report.tests.map((t) => t.duration))}ms
- **Slowest Test**: ${Math.max(...report.tests.map((t) => t.duration))}ms
- **Average Duration**: ${(report.tests.reduce((sum, t) => sum + t.duration, 0) / report.tests.length).toFixed(0)}ms

## Troubleshooting Guide

### Common Issues
1. **TypeScript Errors**: Run \`bun run typecheck\` to identify and fix type issues
2. **Hanging Tests**: Integration and component tests may hang due to configuration issues
3. **Missing Dependencies**: Ensure all dev dependencies are installed with \`bun install\`

### Recommended CI Pipeline
\`\`\`yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck
      - run: bun run test:unit:logic
      - run: bun run lint
      - run: bun audit
\`\`\`

Generated by CI/CD Validation Script v1.0
`

    return output
  }
}

// CLI execution
if (import.meta.main) {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')
  const validator = new CICDValidator(verbose)

  try {
    const report = await validator.generateReport()
    console.log(report)

    // Write to file
    const reportPath = join(process.cwd(), 'ci-cd-validation-report.md')
    await Bun.write(reportPath, report)
    console.log(`\n📄 Report saved to: ${reportPath}`)
  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  }
}
