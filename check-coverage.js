#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

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

if (filesWithoutTests.length > 0) {
  // Group by directory
  const byDirectory = {}
  for (const file of filesWithoutTests) {
    const dir = path.dirname(file)
    if (!byDirectory[dir]) {
      byDirectory[dir] = []
    }
    byDirectory[dir].push(path.basename(file))
  }

  for (const [_dir, files] of Object.entries(byDirectory)) {
    for (const _file of files) {
    }
  }
}
