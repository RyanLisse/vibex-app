#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Function to find all source files
function findSourceFiles(
  dir,
  extensions = ['.ts', '.tsx'],
  exclude = ['node_modules', '.next', 'dist', 'coverage']
) {
  const files = []

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir)

    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        if (!exclude.some((ex) => fullPath.includes(ex))) {
          walk(fullPath)
        }
      } else if (extensions.some((ext) => item.endsWith(ext))) {
        // Skip test files, type definition files, and story files
        if (
          !(
            item.includes('.test.') ||
            item.includes('.spec.') ||
            item.endsWith('.d.ts') ||
            item.includes('.stories.')
          )
        ) {
          files.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return files
}

// Function to check if a test file exists for a source file
function hasTestFile(sourceFile) {
  const dir = path.dirname(sourceFile)
  const basename = path.basename(sourceFile)
  const nameWithoutExt = basename.replace(/\.(ts|tsx)$/, '')

  const possibleTestFiles = [
    path.join(dir, `${nameWithoutExt}.test.ts`),
    path.join(dir, `${nameWithoutExt}.test.tsx`),
    path.join(dir, `${nameWithoutExt}.spec.ts`),
    path.join(dir, `${nameWithoutExt}.spec.tsx`),
  ]

  return possibleTestFiles.some((testFile) => fs.existsSync(testFile))
}

// Main execution
const projectRoot = process.cwd()
const sourceFiles = findSourceFiles(projectRoot)

const filesWithTests = []
const filesWithoutTests = []

for (const file of sourceFiles) {
  const relativePath = path.relative(projectRoot, file)
  if (hasTestFile(file)) {
    filesWithTests.push(relativePath)
  } else {
    filesWithoutTests.push(relativePath)
  }
}

// Sort files by directory
filesWithoutTests.sort()
filesWithTests.sort()

console.log('📊 Test Coverage Summary')
console.log('========================')
console.log(`Total source files: ${sourceFiles.length}`)
console.log(`Files with tests: ${filesWithTests.length}`)
console.log(`Files without tests: ${filesWithoutTests.length}`)
console.log(`Coverage: ${((filesWithTests.length / sourceFiles.length) * 100).toFixed(1)}%`)
console.log('')

if (filesWithoutTests.length > 0) {
  console.log('❌ Files without tests:')
  console.log('=======================')

  // Group by directory
  const byDirectory = {}
  for (const file of filesWithoutTests) {
    const dir = path.dirname(file)
    if (!byDirectory[dir]) {
      byDirectory[dir] = []
    }
    byDirectory[dir].push(path.basename(file))
  }

  for (const [dir, files] of Object.entries(byDirectory)) {
    console.log(`\n${dir}/`)
    for (const file of files) {
      console.log(`  - ${file}`)
    }
  }
}

console.log('\n✅ Next steps to achieve 100% coverage:')
console.log('1. Create test files for the remaining', filesWithoutTests.length, 'source files')
console.log('2. Focus on critical paths first (actions, hooks, lib)')
console.log('3. Run "bun run test:coverage" to see line-level coverage')
