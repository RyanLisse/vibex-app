#!/usr/bin/env bun

import { promises as fs } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

interface TestHealth {
  totalTests: number
  passingTests: number
  failingTests: number
  skippedTests: number
  coverage: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
  performance: {
    averageDuration: number
    slowestTests: Array<{ file: string; duration: number }>
  }
  quality: {
    orphanedTests: number
    missingTests: number
    outdatedTests: number
    largeTests: number
  }
  recommendations: string[]
}

async function collectTestHealth(): Promise<TestHealth> {
  const projectRoot = process.cwd()

  // Initialize health metrics
  const health: TestHealth = {
    totalTests: 0,
    passingTests: 0,
    failingTests: 0,
    skippedTests: 0,
    coverage: {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0,
    },
    performance: {
      averageDuration: 0,
      slowestTests: [],
    },
    quality: {
      orphanedTests: 0,
      missingTests: 0,
      outdatedTests: 0,
      largeTests: 0,
    },
    recommendations: [],
  }

  // Load test analysis reports if they exist
  try {
    const analysisReport = JSON.parse(
      await fs.readFile(join(projectRoot, 'test-analysis-report.json'), 'utf-8')
    )
    health.totalTests = analysisReport.totalTests
    health.quality.orphanedTests = analysisReport.orphanedTests.length
    health.quality.missingTests = analysisReport.missingTests.length
    health.quality.largeTests = analysisReport.largeTests.length
    health.quality.outdatedTests = analysisReport.oldTests.length
  } catch {}

  try {
    const relevanceReport = JSON.parse(
      await fs.readFile(join(projectRoot, 'test-relevance-report.json'), 'utf-8')
    )
    const criticalTests = relevanceReport.tests.filter((t: any) => t.relevanceScore < 30)
    if (criticalTests.length > 0) {
      health.recommendations.push(
        `Fix ${criticalTests.length} critical test issues (relevance score < 30)`
      )
    }
  } catch {}

  try {
    const optimizationReport = JSON.parse(
      await fs.readFile(join(projectRoot, 'test-optimization-report.json'), 'utf-8')
    )
    if (optimizationReport.estimatedTimeSaving > 20) {
      health.recommendations.push(
        `Optimize tests for ${optimizationReport.estimatedTimeSaving}% performance improvement`
      )
    }
  } catch {}

  // Generate recommendations based on metrics
  if (health.quality.orphanedTests > 10) {
    health.recommendations.push(
      `Remove ${health.quality.orphanedTests} orphaned tests without source files`
    )
  }

  if (health.quality.missingTests > 50) {
    health.recommendations.push(
      `Add tests for ${health.quality.missingTests} untested source files`
    )
  }

  if (health.quality.largeTests > 5) {
    health.recommendations.push(`Split ${health.quality.largeTests} large test files (>500 lines)`)
  }

  if (health.coverage.lines < 80) {
    health.recommendations.push('Increase code coverage to meet 80% threshold')
  }

  return health
}

async function generateDashboard() {
  const health = await collectTestHealth()

  const dashboard = `# Test Health Dashboard

Generated: ${new Date().toISOString()}

## 📊 Overview

- **Total Tests**: ${health.totalTests}
- **Test Status**: 🟢 ${health.passingTests} passing | 🔴 ${health.failingTests} failing | ⏭️ ${health.skippedTests} skipped

## 🎯 Coverage Metrics

| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| Lines | ${health.coverage.lines}% | 80% | ${health.coverage.lines >= 80 ? '✅' : '❌'} |
| Functions | ${health.coverage.functions}% | 80% | ${health.coverage.functions >= 80 ? '✅' : '❌'} |
| Branches | ${health.coverage.branches}% | 80% | ${health.coverage.branches >= 80 ? '✅' : '❌'} |
| Statements | ${health.coverage.statements}% | 80% | ${health.coverage.statements >= 80 ? '✅' : '❌'} |

## 🏃 Performance

- **Average Test Duration**: ${health.performance.averageDuration}ms
- **Slowest Tests**:
${health.performance.slowestTests
  .slice(0, 5)
  .map((t) => `  - ${t.file}: ${t.duration}ms`)
  .join('\n')}

## 🔍 Quality Metrics

- **Orphaned Tests**: ${health.quality.orphanedTests} (tests without source files)
- **Missing Tests**: ${health.quality.missingTests} (source files without tests)
- **Large Tests**: ${health.quality.largeTests} (>500 lines)
- **Outdated Tests**: ${health.quality.outdatedTests} (>30 days old)

## 📋 Recommendations

${health.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## 🚀 Quick Actions

\`\`\`bash
# Run test analysis
bun run scripts/test-analysis.ts

# Check test relevance
bun run scripts/test-relevance-analyzer.ts

# Optimize tests
bun run scripts/test-optimization-toolkit.ts

# Clean up orphaned tests
bun run scripts/cleanup-orphaned-tests.ts

# Setup coverage
bun run scripts/coverage-setup.ts
\`\`\`

## 📈 Progress Tracking

Track your test health improvements:

1. **Baseline** (current):
   - Tests: ${health.totalTests}
   - Orphaned: ${health.quality.orphanedTests}
   - Missing: ${health.quality.missingTests}
   - Large: ${health.quality.largeTests}

2. **Target** (after optimization):
   - Tests: ${health.totalTests + Math.floor(health.quality.missingTests * 0.5)}
   - Orphaned: 0
   - Missing: ${Math.floor(health.quality.missingTests * 0.5)}
   - Large: 0

## 🔧 Test Framework Status

**Note**: Test framework stabilization is in progress. Once tests are running:

1. Generate coverage baseline: \`npm run test:coverage\`
2. Run performance profiling: \`bun run scripts/test-performance.ts\`
3. Execute optimization scripts
4. Validate improvements

---

*Dashboard will be updated automatically as test metrics improve*
`

  const dashboardPath = join(process.cwd(), 'test-health-dashboard.md')
  await fs.writeFile(dashboardPath, dashboard)

  console.log('=== TEST HEALTH DASHBOARD ===\n')
  console.log(`Total Tests: ${health.totalTests}`)
  console.log(
    `Quality Issues: ${health.quality.orphanedTests + health.quality.missingTests + health.quality.largeTests}`
  )
  console.log(`Recommendations: ${health.recommendations.length}`)
  console.log(`\nDashboard saved to: ${dashboardPath}`)

  // Generate summary for CI/CD
  const ciSummary = {
    timestamp: new Date().toISOString(),
    metrics: {
      totalTests: health.totalTests,
      qualityScore: Math.max(
        0,
        100 - (health.quality.orphanedTests + health.quality.missingTests) / 10
      ),
      readyForCoverage: false, // Will be true when tests pass
    },
    nextSteps: [
      'Wait for test framework stabilization',
      'Run coverage analysis',
      'Execute optimization scripts',
      'Achieve 100% test pass rate',
    ],
  }

  await fs.writeFile(
    join(process.cwd(), 'test-health-ci-summary.json'),
    JSON.stringify(ciSummary, null, 2)
  )
}

// Generate dashboard
generateDashboard().catch(console.error)
