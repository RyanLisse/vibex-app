#!/usr/bin/env bun

import { promises as fs } from 'fs'
import { Glob } from 'glob'
import path from 'path'

interface Fix {
  file: string
  line: number
  issue: string
  fix: string
}

const fixes: Fix[] = []

// Fix forEach loops to for...of loops
async function fixForEachLoops(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  let modified = false
  const localFixes: Fix[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Pattern 1: array.forEach(item => {
    const forEachMatch = line.match(/(\s*)(.+)\.forEach\((\w+) => \{/)
    if (forEachMatch) {
      const [, indent, array, item] = forEachMatch
      lines[i] = `${indent}for (const ${item} of ${array}) {`
      modified = true
      localFixes.push({
        file: filePath,
        line: i + 1,
        issue: 'forEach loop',
        fix: 'for...of loop',
      })
    }

    // Pattern 2: array.forEach((item) => {
    const forEachMatch2 = line.match(/(\s*)(.+)\.forEach\(\((\w+)\) => \{/)
    if (forEachMatch2) {
      const [, indent, array, item] = forEachMatch2
      lines[i] = `${indent}for (const ${item} of ${array}) {`
      modified = true
      localFixes.push({
        file: filePath,
        line: i + 1,
        issue: 'forEach loop',
        fix: 'for...of loop',
      })
    }

    // Pattern 3: array.forEach((item, index) => {
    const forEachMatch3 = line.match(/(\s*)(.+)\.forEach\(\((\w+), (\w+)\) => \{/)
    if (forEachMatch3) {
      const [, indent, array, item, index] = forEachMatch3
      lines[i] = `${indent}for (const [${index}, ${item}] of ${array}.entries()) {`
      modified = true
      localFixes.push({
        file: filePath,
        line: i + 1,
        issue: 'forEach with index',
        fix: 'for...of with entries()',
      })
    }
  }

  if (modified) {
    await fs.writeFile(filePath, lines.join('\n'))
    fixes.push(...localFixes)
  }
}

// Fix non-null assertions
async function fixNonNullAssertions(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  let modified = false
  const localFixes: Fix[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Pattern: something.get(key)!
    const nonNullMatch = line.match(/(.+)\.get\(([^)]+)\)!/)
    if (nonNullMatch) {
      const [fullMatch, prefix, key] = nonNullMatch

      // Check if it's in a variable assignment
      if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
        // Add a guard clause after
        const varMatch = line.match(/(const|let|var) (\w+) = .+\.get\([^)]+\)!/)
        if (varMatch) {
          const [, , varName] = varMatch
          lines[i] = line.replace(/!/, '')
          lines.splice(i + 1, 0, `${line.match(/^\s*/)?.[0] || ''}if (!${varName}) return;`)
          modified = true
          localFixes.push({
            file: filePath,
            line: i + 1,
            issue: 'non-null assertion',
            fix: 'guard clause',
          })
        }
      } else {
        // Replace with optional chaining or nullish coalescing
        lines[i] = line.replace(/!/, ' ?? {}')
        modified = true
        localFixes.push({
          file: filePath,
          line: i + 1,
          issue: 'non-null assertion',
          fix: 'nullish coalescing',
        })
      }
    }

    // Pattern: array[index]!
    const arrayNonNullMatch = line.match(/(\w+)\[(\w+)\]!/)
    if (arrayNonNullMatch) {
      lines[i] = line.replace(/!/, ' ?? null')
      modified = true
      localFixes.push({
        file: filePath,
        line: i + 1,
        issue: 'non-null assertion on array',
        fix: 'nullish coalescing',
      })
    }
  }

  if (modified) {
    await fs.writeFile(filePath, lines.join('\n'))
    fixes.push(...localFixes)
  }
}

// Fix any types
async function fixAnyTypes(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  let modified = false
  const localFixes: Fix[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Pattern: : any
    if (line.includes(': any')) {
      // Common patterns and their replacements
      const replacements = [
        { pattern: /: any\[\]/, replacement: ': unknown[]' },
        { pattern: /: any\)/, replacement: ': unknown)' },
        { pattern: /: any,/, replacement: ': unknown,' },
        { pattern: /: any;/, replacement: ': unknown;' },
        { pattern: /: any =/, replacement: ': unknown =' },
        { pattern: /: any\s*$/, replacement: ': unknown' },
        // Specific patterns
        { pattern: /<any>/, replacement: '<unknown>' },
        { pattern: /as any/, replacement: 'as unknown' },
        // Map patterns
        { pattern: /Map<any, any>/, replacement: 'Map<unknown, unknown>' },
        { pattern: /Map<string, any>/, replacement: 'Map<string, unknown>' },
        // Function parameters
        { pattern: /\((\w+): any\)/, replacement: '($1: unknown)' },
        { pattern: /\((\w+): any,/, replacement: '($1: unknown,' },
      ]

      let lineModified = false
      for (const { pattern, replacement } of replacements) {
        if (pattern.test(line)) {
          lines[i] = line.replace(pattern, replacement)
          lineModified = true
          localFixes.push({
            file: filePath,
            line: i + 1,
            issue: 'any type',
            fix: 'unknown type',
          })
          break
        }
      }

      if (lineModified) {
        modified = true
      }
    }
  }

  if (modified) {
    await fs.writeFile(filePath, lines.join('\n'))
    fixes.push(...localFixes)
  }
}

async function main() {
  console.log('🔧 Fixing code quality issues...\n')

  // Find all TypeScript files
  const g = new Glob('**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/*.d.ts'],
    cwd: process.cwd(),
  })

  const tsFiles = [...g]

  console.log(`📁 Found ${tsFiles.length} TypeScript files to check\n`)

  // Process each file
  let processedFiles = 0
  for (const file of tsFiles) {
    const filePath = path.join(process.cwd(), file)

    try {
      await fixForEachLoops(filePath)
      await fixNonNullAssertions(filePath)
      await fixAnyTypes(filePath)

      processedFiles++
      if (processedFiles % 50 === 0) {
        console.log(`  Processed ${processedFiles} files...`)
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error)
    }
  }

  // Report results
  console.log('\n📊 Fix Summary:')
  console.log(`  Files processed: ${processedFiles}`)
  console.log(`  Total fixes applied: ${fixes.length}`)

  if (fixes.length > 0) {
    // Group fixes by type
    const fixesByType = fixes.reduce(
      (acc, fix) => {
        acc[fix.issue] = (acc[fix.issue] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    console.log('\n📈 Fixes by type:')
    for (const [issue, count] of Object.entries(fixesByType)) {
      console.log(`  ${issue}: ${count}`)
    }

    // Show first 10 fixes as examples
    console.log('\n📝 Example fixes (first 10):')
    fixes.slice(0, 10).forEach((fix) => {
      console.log(`  ${fix.file}:${fix.line} - ${fix.issue} → ${fix.fix}`)
    })

    if (fixes.length > 10) {
      console.log(`  ... and ${fixes.length - 10} more`)
    }
  }

  console.log('\n✅ Code quality fixes complete!')
  console.log('💡 Run "bun run type-check" to verify the changes')
}

main().catch(console.error)
