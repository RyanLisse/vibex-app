#!/usr/bin/env bun

import { promises as fs } from 'fs'
import path from 'path'

async function* walkDir(dir: string): AsyncGenerator<string> {
  const files = await fs.readdir(dir, { withFileTypes: true })

  for (const file of files) {
    const fullPath = path.join(dir, file.name)

    if (file.isDirectory()) {
      // Skip certain directories
      if (['node_modules', '.next', 'dist', 'build', '.git'].includes(file.name)) {
        continue
      }
      yield* walkDir(fullPath)
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
      // Skip declaration files
      if (!file.name.endsWith('.d.ts')) {
        yield fullPath
      }
    }
  }
}

// Fix specific file - local-storage.ts
async function fixLocalStorageFile() {
  const filePath =
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/tests/mocks/local-storage.ts'

  try {
    let content = await fs.readFile(filePath, 'utf-8')
    let modified = false

    // Fix any types in cmp function
    if (content.includes('cmp: vi.fn().mockImplementation((a: any, b: any)')) {
      content = content.replace(
        'cmp: vi.fn().mockImplementation((a: any, b: any)',
        'cmp: vi.fn().mockImplementation((a: unknown, b: unknown)'
      )
      modified = true
    }

    // Fix any types in test helpers
    if (content.includes('expect.any(Number)')) {
      // This is actually fine, it's a Jest matcher
    }

    if (modified) {
      await fs.writeFile(filePath, content)
      console.log('✅ Fixed local-storage.ts')
    }
  } catch (error) {
    console.error('❌ Error fixing local-storage.ts:', error)
  }
}

// Fix forEach loops in specific files
async function fixForEachLoops() {
  const filesToFix = [
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/src/types/telemetry.test.ts',
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/src/features/example-feature/types.test.ts',
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/src/features/example-feature/utils/example-utils.test.ts',
  ]

  for (const filePath of filesToFix) {
    try {
      let content = await fs.readFile(filePath, 'utf-8')
      let modified = false

      // Simple forEach replacements
      const patterns = [
        // statuses.forEach((status) => {
        {
          from: /(\s+)(\w+)\.forEach\((\((\w+)\) => \{)/g,
          to: '$1for (const $4 of $2) {',
        },
        // priorities.forEach((priority, index) => {
        {
          from: /(\s+)(\w+)\.forEach\((\((\w+), (\w+)\) => \{)/g,
          to: '$1for (const [$5, $4] of $2.entries()) {',
        },
      ]

      for (const pattern of patterns) {
        if (pattern.from.test(content)) {
          content = content.replace(pattern.from, pattern.to)
          modified = true
        }
      }

      if (modified) {
        await fs.writeFile(filePath, content)
        console.log(`✅ Fixed forEach loops in ${path.basename(filePath)}`)
      }
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error)
    }
  }
}

// Fix non-null assertions
async function fixNonNullAssertions() {
  const filesToCheck = [
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/tests/mocks/local-storage.ts',
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/lib/auth/anthropic.ts',
    '/Volumes/Main SSD/CascadeProjects/experiments/vibekit/templates/codex-clone/hooks/use-gemini-audio.test.ts',
  ]

  for (const filePath of filesToCheck) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const modified = false

      // This is more complex and needs careful handling
      // For now, let's just report them
      const nonNullMatches = content.match(/[^!]=![^=]/g)
      if (nonNullMatches && nonNullMatches.length > 0) {
        console.log(
          `⚠️  Found ${nonNullMatches.length} non-null assertions in ${path.basename(filePath)}`
        )
      }
    } catch (error) {
      console.error(`❌ Error checking ${filePath}:`, error)
    }
  }
}

async function main() {
  console.log('🔧 Fixing code quality issues...\n')

  // Fix specific files
  await fixLocalStorageFile()
  await fixForEachLoops()
  await fixNonNullAssertions()

  console.log('\n✅ Code quality fixes complete!')
  console.log('💡 Run "bun run type-check" to verify the changes')
}

main().catch(console.error)
