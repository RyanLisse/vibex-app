#!/usr/bin/env bun

import { promises as fs } from 'fs'
import path from 'path'
import { glob } from 'glob'

async function findSkippedTests() {
  console.log('🔍 Searching for skipped tests...\n')
  
  // Find all test files
  const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
    cwd: process.cwd(),
  })
  
  const skippedTests: { file: string; line: number; content: string }[] = []
  
  for (const file of testFiles) {
    try {
      const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8')
      const lines = content.split('\n')
      
      lines.forEach((line, index) => {
        if (line.match(/\.(skip|only)\(|describe\.(skip|only)|it\.(skip|only)|test\.(skip|only)/)) {
          skippedTests.push({
            file,
            line: index + 1,
            content: line.trim(),
          })
        }
      })
    } catch (error) {
      // Ignore files that can't be read
    }
  }
  
  return skippedTests
}

async function main() {
  const skipped = await findSkippedTests()
  
  if (skipped.length === 0) {
    console.log('✅ Success! No skipped or focused tests found.')
    console.log(`   Checked ${(await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      ignore: ['node_modules/**', 'dist/**', '.next/**'],
    })).length} test files.`)
  } else {
    console.log(`❌ Found ${skipped.length} skipped or focused tests:\n`)
    
    const byFile = skipped.reduce((acc, test) => {
      if (!acc[test.file]) acc[test.file] = []
      acc[test.file].push(test)
      return acc
    }, {} as Record<string, typeof skipped>)
    
    Object.entries(byFile).forEach(([file, tests]) => {
      console.log(`📄 ${file}:`)
      tests.forEach(test => {
        console.log(`   Line ${test.line}: ${test.content}`)
      })
      console.log()
    })
    
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})