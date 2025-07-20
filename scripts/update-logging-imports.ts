#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { join } from 'path'

// Find all files that import from @/lib/logging
const files = glob
  .sync('app/**/*.{ts,tsx}', { cwd: process.cwd() })
  .filter((file) => !file.includes('node_modules'))
  .filter((file) => !file.includes('.next'))

let updated = 0

for (const file of files) {
  const filePath = join(process.cwd(), file)
  let content = readFileSync(filePath, 'utf-8')

  // Check if it imports from @/lib/logging
  if (content.includes("from '@/lib/logging'")) {
    // Skip if it's the logging module itself
    if (file.includes('lib/logging/')) continue

    // Update the import to use safe-wrapper
    content = content.replace(
      /from\s+['"]@\/lib\/logging['"]/g,
      "from '@/lib/logging/safe-wrapper'"
    )

    writeFileSync(filePath, content)
    console.log(`✅ Updated imports in ${file}`)
    updated++
  }
}

console.log(`\n✨ Updated ${updated} files to use safe logging wrapper`)
