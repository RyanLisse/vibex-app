#!/usr/bin/env bun

import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import path from 'path'

async function fixBunToVitestImports() {
  console.log('🔄 Converting bun:test imports to vitest...')

  // Find all test files with bun:test imports
  const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**'],
    absolute: true,
  })

  let filesFixed = 0
  let totalFiles = 0

  for (const file of testFiles) {
    try {
      const content = await readFile(file, 'utf-8')

      // Check if file uses bun:test
      if (!content.includes("from 'bun:test'") && !content.includes('from "bun:test"')) {
        continue
      }

      totalFiles++
      console.log(`📝 Processing: ${path.relative(process.cwd(), file)}`)

      let updatedContent = content

      // Replace bun:test imports with vitest
      updatedContent = updatedContent.replace(/from\s+['"]bun:test['"]/g, "from 'vitest'")

      // Replace any Bun-specific test utilities that don't exist in vitest
      // For example, if using Bun's mock function differently
      updatedContent = updatedContent.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/g,
        (match, imports) => {
          // Clean up imports - remove any Bun-specific ones that don't exist in vitest
          const cleanedImports = imports
            .split(',')
            .map((imp: string) => imp.trim())
            .filter((imp: string) => {
              // Keep standard vitest imports
              const vitestImports = [
                'describe',
                'it',
                'test',
                'expect',
                'beforeEach',
                'afterEach',
                'beforeAll',
                'afterAll',
                'vi',
                'suite',
                'assert',
                'chai',
                'vitest',
                'createMockFn',
                'fn',
                'spyOn',
                'mocked',
                'SpyInstance',
              ]
              return vitestImports.includes(imp)
            })
            .join(', ')

          // Replace 'mock' with 'vi.fn' in imports if needed
          const finalImports = cleanedImports.replace(/\bmock\b/g, 'vi')

          return `import { ${finalImports} } from 'vitest'`
        }
      )

      // Replace mock() calls with vi.fn()
      updatedContent = updatedContent.replace(/\bmock\(/g, 'vi.fn(')

      // Replace spyOn standalone usage with vi.spyOn
      updatedContent = updatedContent.replace(/(?<!\.)\bspyOn\(/g, 'vi.spyOn(')

      // If the file is different, write it back
      if (updatedContent !== content) {
        await writeFile(file, updatedContent, 'utf-8')
        filesFixed++
        console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`)
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error)
    }
  }

  console.log(`\n✨ Conversion complete!`)
  console.log(`📊 Fixed ${filesFixed} out of ${totalFiles} files with bun:test imports`)
}

// Run the script
fixBunToVitestImports().catch(console.error)
