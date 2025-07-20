#!/usr/bin/env bun

import { promises as fs } from 'fs'
import { glob } from 'glob'
import { join, relative } from 'path'

interface TestRelevance {
  testPath: string
  sourcePath?: string
  imports: string[]
  testCount: number
  hasAsyncTests: boolean
  hasMocks: boolean
  lastModified: Date
  relevanceScore: number
  issues: string[]
}

async function analyzeTestRelevance(testPath: string): Promise<TestRelevance> {
  const content = await fs.readFile(testPath, 'utf-8')
  const stats = await fs.stat(testPath)

  const issues: string[] = []

  // Extract imports
  const imports: string[] = []
  const importMatches = content.matchAll(
    /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
  )
  for (const match of importMatches) {
    imports.push(match[1])
  }

  // Count tests
  const testMatches = content.match(/\b(test|it|describe)\s*\(/g) || []
  const testCount = testMatches.length

  // Check for async tests
  const hasAsyncTests = /\b(async\s+\(\)|\.resolves|\.rejects|await\s+)/m.test(content)

  // Check for mocks
  const hasMocks = /\b(mock|spy|stub|vi\.fn|jest\.fn)/i.test(content)

  // Try to find the source file being tested
  let sourcePath: string | undefined
  const sourceImports = imports.filter(
    (imp) =>
      (!(
        imp.includes('test') ||
        imp.includes('mock') ||
        imp.includes('vitest') ||
        imp.includes('jest') ||
        imp.includes('@testing-library')
      ) &&
        imp.startsWith('.')) ||
      imp.startsWith('@/')
  )

  if (sourceImports.length > 0) {
    sourcePath = sourceImports[0]
  }

  // Check for potential issues
  if (testCount === 0) {
    issues.push('No tests found')
  }

  if (imports.length === 0) {
    issues.push('No imports found')
  }

  if (!sourcePath) {
    issues.push('No clear source file import')
  }

  // Check for outdated patterns
  if (content.includes('enzyme')) {
    issues.push('Uses outdated Enzyme library')
  }

  if (content.includes('jest.mock') && !content.includes('vi.mock')) {
    issues.push('Uses Jest mocks instead of Vitest')
  }

  if (content.includes('waitFor') && !content.includes('@testing-library')) {
    issues.push('Custom waitFor instead of Testing Library')
  }

  // Check for console logs
  if (content.match(/console\.(log|error|warn)/)) {
    issues.push('Contains console statements')
  }

  // Check for .only or .skip
  if (content.match(/\.(only|skip)\s*\(/)) {
    issues.push('Contains .only or .skip')
  }

  // Calculate relevance score (0-100)
  let relevanceScore = 100

  if (testCount === 0) relevanceScore -= 50
  if (!sourcePath) relevanceScore -= 20
  if (issues.length > 0) relevanceScore -= issues.length * 5
  if (stats.mtime < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) relevanceScore -= 10 // >90 days old
  if (!hasMocks && testCount > 0) relevanceScore -= 5 // Tests without mocks might be integration tests

  relevanceScore = Math.max(0, relevanceScore)

  return {
    testPath,
    sourcePath,
    imports,
    testCount,
    hasAsyncTests,
    hasMocks,
    lastModified: stats.mtime,
    relevanceScore,
    issues,
  }
}

async function checkSourceFileExists(sourcePath: string, testPath: string): Promise<boolean> {
  const projectRoot = process.cwd()

  // Convert relative import to possible file paths
  const testDir = join(projectRoot, testPath, '..')
  const possiblePaths = [
    join(testDir, sourcePath + '.ts'),
    join(testDir, sourcePath + '.tsx'),
    join(testDir, sourcePath + '/index.ts'),
    join(testDir, sourcePath + '/index.tsx'),
    join(projectRoot, sourcePath.replace('@/', './') + '.ts'),
    join(projectRoot, sourcePath.replace('@/', './') + '.tsx'),
  ]

  for (const path of possiblePaths) {
    try {
      await fs.access(path)
      return true
    } catch {}
  }

  return false
}

async function generateRelevanceReport() {
  const projectRoot = process.cwd()

  // Find all test files
  const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
  })

  console.log(`Analyzing relevance of ${testFiles.length} test files...\n`)

  // Analyze each test file
  const analyses = await Promise.all(testFiles.map((file) => analyzeTestRelevance(file)))

  // Check if source files exist
  for (const analysis of analyses) {
    if (analysis.sourcePath) {
      const exists = await checkSourceFileExists(analysis.sourcePath, analysis.testPath)
      if (!exists) {
        analysis.issues.push('Source file not found')
        analysis.relevanceScore -= 20
        analysis.relevanceScore = Math.max(0, analysis.relevanceScore)
      }
    }
  }

  // Sort by relevance score
  analyses.sort((a, b) => a.relevanceScore - b.relevanceScore)

  // Categorize tests
  const criticalTests = analyses.filter((a) => a.relevanceScore < 30)
  const warningTests = analyses.filter((a) => a.relevanceScore >= 30 && a.relevanceScore < 60)
  const goodTests = analyses.filter((a) => a.relevanceScore >= 60)

  console.log('=== TEST RELEVANCE REPORT ===\n')

  console.log(`Total tests analyzed: ${testFiles.length}`)
  console.log(`Critical issues: ${criticalTests.length}`)
  console.log(`Warnings: ${warningTests.length}`)
  console.log(`Good tests: ${goodTests.length}`)

  if (criticalTests.length > 0) {
    console.log('\n=== CRITICAL TESTS (Need immediate attention) ===\n')
    criticalTests.slice(0, 20).forEach((test) => {
      console.log(`${test.testPath} (score: ${test.relevanceScore})`)
      test.issues.forEach((issue) => {
        console.log(`  ⚠️  ${issue}`)
      })
      console.log()
    })
  }

  if (warningTests.length > 0) {
    console.log('\n=== WARNING TESTS (Should be reviewed) ===\n')
    warningTests.slice(0, 10).forEach((test) => {
      console.log(`${test.testPath} (score: ${test.relevanceScore})`)
      test.issues.forEach((issue) => {
        console.log(`  ⚠️  ${issue}`)
      })
    })
  }

  // Generate migration script for critical tests
  const migrationScript = `#!/bin/bash
# Migration script for critical tests

echo "Tests that need immediate attention:"
${criticalTests
  .filter((t) => t.testCount === 0)
  .map((t) => `echo "  Empty test: ${t.testPath}"`)
  .join('\n')}

echo ""
echo "Tests with missing source files:"
${criticalTests
  .filter((t) => t.issues.includes('Source file not found'))
  .map((t) => `echo "  ${t.testPath}"`)
  .join('\n')}

echo ""
echo "Tests with Jest patterns (need Vitest migration):"
${criticalTests
  .filter((t) => t.issues.includes('Uses Jest mocks instead of Vitest'))
  .map((t) => `echo "  ${t.testPath}"`)
  .join('\n')}
`

  const migrationPath = join(projectRoot, 'scripts/migrate-critical-tests.sh')
  await fs.writeFile(migrationPath, migrationScript)
  await fs.chmod(migrationPath, '755')

  // Save detailed report
  const reportPath = join(projectRoot, 'test-relevance-report.json')
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        summary: {
          total: analyses.length,
          critical: criticalTests.length,
          warning: warningTests.length,
          good: goodTests.length,
          averageScore: analyses.reduce((sum, a) => sum + a.relevanceScore, 0) / analyses.length,
        },
        tests: analyses,
      },
      null,
      2
    )
  )

  console.log(`\nMigration script: ${migrationPath}`)
  console.log(`Detailed report: ${reportPath}`)
}

// Run analysis
generateRelevanceReport().catch(console.error)
