#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Find all test files
const testFiles = glob.sync('**/*.test.{ts,tsx,js,jsx}', {
  ignore: ['node_modules/**', 'dist/**', '.next/**', 'coverage/**'],
})

console.log(`Found ${testFiles.length} test files to check...`)

let filesFixed = 0

testFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8')
  let modified = content

  // Check if file uses mock() without vi.mock()
  if (/^mock\(/m.test(content) || /\bmock\(/g.test(content)) {
    // Add vi import if not present
    if (!content.includes('import { vi }') && !content.includes('import {vi}')) {
      // Check if there's already a vitest import
      if (content.includes("from 'vitest'")) {
        // Add vi to existing import
        modified = modified.replace(/from ['"]vitest['"]/, (match) => {
          const importMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]vitest['"]/)
          if (importMatch && !importMatch[1].includes('vi')) {
            return match.replace('{', '{ vi, ')
          }
          return match
        })
      } else {
        // Add new import after first import or at top
        const firstImportIndex = modified.search(/^import\s/m)
        if (firstImportIndex !== -1) {
          const firstImportEnd = modified.indexOf('\n', firstImportIndex)
          modified =
            modified.slice(0, firstImportEnd + 1) +
            "import { vi } from 'vitest'\n" +
            modified.slice(firstImportEnd + 1)
        } else {
          modified = "import { vi } from 'vitest'\n" + modified
        }
      }
    }

    // Replace mock() with vi.fn()
    modified = modified.replace(/(?<!vi\.)(?<!\.)\bmock\(\)/g, 'vi.fn()')

    // Replace mock(() => ...) with vi.fn(() => ...)
    modified = modified.replace(/(?<!vi\.)(?<!\.)\bmock\((\s*\([^)]*\)\s*=>\s*)/g, 'vi.fn($1')

    // Replace mock('module', ...) with vi.mock('module', ...)
    modified = modified.replace(/^mock\(/gm, 'vi.mock(')

    // Replace const x = mock() with const x = vi.fn()
    modified = modified.replace(/=\s*mock\(\)/g, '= vi.fn()')

    if (modified !== content) {
      fs.writeFileSync(file, modified)
      filesFixed++
      console.log(`Fixed: ${file}`)
    }
  }
})

console.log(`\nFixed ${filesFixed} files.`)
