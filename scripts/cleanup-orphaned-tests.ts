#!/usr/bin/env bun

import { promises as fs } from 'fs'
import { glob } from 'glob'
import { basename, dirname, join } from 'path'

interface OrphanedTest {
  testPath: string
  expectedSourcePaths: string[]
  reason: string
}

async function findOrphanedTests(): Promise<OrphanedTest[]> {
  const projectRoot = process.cwd()

  // Find all test files
  const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
  })

  console.log(`Analyzing ${testFiles.length} test files for orphans...`)

  const orphanedTests: OrphanedTest[] = []

  for (const testFile of testFiles) {
    // Skip some special test files that don't need source files
    if (
      testFile.includes('tests/setup/') ||
      testFile.includes('tests/fixtures/') ||
      testFile.includes('tests/e2e/') ||
      testFile.includes('.config.test.')
    ) {
      continue
    }

    // Try to find corresponding source file
    const possibleSourcePaths = [
      // Direct replacement of .test/.spec extension
      testFile.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '.$2'),
      // In __tests__ directory
      testFile
        .replace(/\/__tests__\//, '/')
        .replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '.$2'),
      // Index file in directory
      testFile.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '/index.$2'),
      // Without -test suffix
      testFile.replace(/-test\.(test|spec)\.(ts|tsx|js|jsx)$/, '.$2'),
    ]

    let hasSourceFile = false

    for (const sourcePath of possibleSourcePaths) {
      try {
        await fs.access(join(projectRoot, sourcePath))
        hasSourceFile = true
        break
      } catch {}
    }

    if (!hasSourceFile) {
      // Check if the test file imports a real source file
      const testContent = await fs.readFile(join(projectRoot, testFile), 'utf-8')
      const importMatch = testContent.match(/from\s+['"]([^'"]+)['"]/g)

      let hasValidImport = false
      if (importMatch) {
        for (const imp of importMatch) {
          const importPath = imp.match(/from\s+['"](.*)['"]/)?.[1]
          if (importPath && !importPath.includes('test') && !importPath.includes('mock')) {
            hasValidImport = true
            break
          }
        }
      }

      if (!hasValidImport) {
        orphanedTests.push({
          testPath: testFile,
          expectedSourcePaths: possibleSourcePaths,
          reason: 'No corresponding source file found',
        })
      }
    }
  }

  return orphanedTests
}

async function analyzeTestContent(testPath: string): Promise<{ lines: number; hasTests: boolean }> {
  const content = await fs.readFile(testPath, 'utf-8')
  const lines = content.split('\n').length

  // Check if file actually contains tests
  const hasTests = /\b(test|it|describe|expect)\s*\(/.test(content)

  return { lines, hasTests }
}

async function generateCleanupReport() {
  const orphanedTests = await findOrphanedTests()

  console.log(`\nFound ${orphanedTests.length} orphaned test files\n`)

  if (orphanedTests.length === 0) {
    console.log('No orphaned tests found!')
    return
  }

  // Analyze each orphaned test
  const analysisResults = await Promise.all(
    orphanedTests.map(async (orphan) => {
      const analysis = await analyzeTestContent(orphan.testPath)
      return { ...orphan, ...analysis }
    })
  )

  // Categorize orphaned tests
  const emptyTests = analysisResults.filter((t) => !t.hasTests)
  const smallTests = analysisResults.filter((t) => t.hasTests && t.lines < 50)
  const largeTests = analysisResults.filter((t) => t.hasTests && t.lines >= 50)

  console.log('=== ORPHANED TEST ANALYSIS ===\n')

  if (emptyTests.length > 0) {
    console.log(`Empty test files (${emptyTests.length}) - Safe to delete:`)
    emptyTests.forEach((test) => {
      console.log(`  rm "${test.testPath}"`)
    })
    console.log()
  }

  if (smallTests.length > 0) {
    console.log(`Small orphaned tests (${smallTests.length}) - Review before deletion:`)
    smallTests.slice(0, 10).forEach((test) => {
      console.log(`  - ${test.testPath} (${test.lines} lines)`)
    })
    if (smallTests.length > 10) {
      console.log(`  ... and ${smallTests.length - 10} more`)
    }
    console.log()
  }

  if (largeTests.length > 0) {
    console.log(`Large orphaned tests (${largeTests.length}) - May contain valuable tests:`)
    largeTests.forEach((test) => {
      console.log(`  - ${test.testPath} (${test.lines} lines)`)
      console.log(`    Expected sources: ${test.expectedSourcePaths.slice(0, 2).join(', ')}`)
    })
    console.log()
  }

  // Generate cleanup script
  const cleanupScriptPath = join(process.cwd(), 'scripts/remove-orphaned-tests.sh')
  const cleanupScript = `#!/bin/bash
# Auto-generated script to remove orphaned test files
# Review before running!

echo "Removing ${emptyTests.length} empty test files..."
${emptyTests.map((t) => `rm "${t.testPath}"`).join('\n')}

echo "Done! Removed ${emptyTests.length} empty test files."
echo ""
echo "To remove small orphaned tests (${smallTests.length} files), review and run:"
echo "  ${smallTests
    .slice(0, 5)
    .map((t) => `rm "${t.testPath}"`)
    .join(' && ')}"
`

  await fs.writeFile(cleanupScriptPath, cleanupScript)
  await fs.chmod(cleanupScriptPath, '755')

  console.log(`Cleanup script generated: ${cleanupScriptPath}`)
  console.log('Review and run: ./scripts/remove-orphaned-tests.sh')

  // Save detailed report
  const reportPath = join(process.cwd(), 'orphaned-tests-report.json')
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        summary: {
          total: orphanedTests.length,
          empty: emptyTests.length,
          small: smallTests.length,
          large: largeTests.length,
        },
        tests: analysisResults,
      },
      null,
      2
    )
  )

  console.log(`\nDetailed report saved to: ${reportPath}`)
}

// Run analysis
generateCleanupReport().catch(console.error)
