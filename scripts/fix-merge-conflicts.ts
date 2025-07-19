#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const filesToFix = [
  'lib/observability/index.ts',
  'lib/workflow/engine.ts',
  'vitest.working.config.ts',
]

function resolveMergeConflicts(content: string): string {
  // Remove conflict markers and keep HEAD version by default
  return (
    content
      // Remove lines with conflict markers and what's between =======... >>>>>>> main
      .replace(/<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> main/g, '$1')
      // Handle any remaining conflict markers
      .replace(/<<<<<<< HEAD\n/g, '')
      .replace(/\n=======\n[\s\S]*?\n>>>>>>> main/g, '')
      .replace(/\n>>>>>>> main/g, '')
      .replace(/=======\n[\s\S]*?\n>>>>>>> main/g, '')
  )
}

console.log('🔧 Fixing merge conflicts...\n')

for (const filePath of filesToFix) {
  const fullPath = join(process.cwd(), filePath)

  if (!existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    continue
  }

  const content = readFileSync(fullPath, 'utf8')

  if (!content.includes('<<<<<<<')) {
    console.log(`✅ No conflicts in: ${filePath}`)
    continue
  }

  console.log(`🔧 Fixing conflicts in: ${filePath}`)

  const resolved = resolveMergeConflicts(content)
  writeFileSync(fullPath, resolved)

  console.log(`✅ Fixed: ${filePath}`)
}

console.log('\n🎉 All merge conflicts resolved!')
