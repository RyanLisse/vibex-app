#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const filePath = join(process.cwd(), 'lib/migration/data-migration.ts')
let content = readFileSync(filePath, 'utf-8')

// Fix all non-null assertion operators with proper null checks
const fixes = [
  {
    pattern: /this\.currentMigration([!?])\.summary\.totalRecords \+= ([^;]+)/g,
    replacement:
      'if (this.currentMigration) {\n        this.currentMigration.summary.totalRecords += $2\n      }',
  },
  {
    pattern: /this\.currentMigration([!?])\.summary\.migratedRecords\+\+/g,
    replacement:
      'if (this.currentMigration) {\n            this.currentMigration.summary.migratedRecords++\n          }',
  },
  {
    pattern: /this\.currentMigration([!?])\.summary\.failedRecords\+\+/g,
    replacement:
      'if (this.currentMigration) {\n            this.currentMigration.summary.failedRecords++\n          }',
  },
  {
    pattern: /this\.currentMigration([!?])\.errors\.push\(/g,
    replacement: 'if (this.currentMigration) {\n            this.currentMigration.errors.push(',
  },
]

// Apply fixes
for (const fix of fixes) {
  content = content.replace(fix.pattern, fix.replacement)
}

// Handle the error push case more carefully
content = content.replace(
  /(\s*)this\.currentMigration([!?])\.summary\.failedRecords\+\+\n(\s*)this\.currentMigration([!?])\.errors\.push\(/g,
  '$1if (this.currentMigration) {\n$1  this.currentMigration.summary.failedRecords++\n$1  this.currentMigration.errors.push('
)

// Fix any remaining standalone error pushes
content = content.replace(
  /(\s*)this\.currentMigration([!?])\.errors\.push\(/g,
  '$1if (this.currentMigration) {\n$1  this.currentMigration.errors.push('
)

// Add closing braces for the error push blocks
content = content.replace(
  /(if \(this\.currentMigration\) \{\n\s+this\.currentMigration\.errors\.push\([^)]+\))\n/g,
  '$1\n          }\n'
)

writeFileSync(filePath, content)
console.log('✅ Fixed migration build errors')
