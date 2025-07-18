#!/usr/bin/env bun

/**
 * Fix remaining Bun test import issues
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const PROJECT_ROOT = process.cwd()

async function fixBunTestImports(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')

    // Skip if already has correct imports
    if (
      content.includes(
        'import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"'
      )
    ) {
      return
    }

    let updatedContent = content

    // Fix mock references
    updatedContent = updatedContent
      .replace(/mock\.restore\(\)/g, 'mock.restore()')
      .replace(/mock\.spyOn\(/g, 'mock.spyOn(')
      .replace(/\.mockImplementation\(/g, '.mockImplementation(')
      .replace(/vi\.restoreAllMocks\(\)/g, 'mock.restore()')
      .replace(/vi\.clearAllMocks\(\)/g, 'mock.restore()')
      .replace(/vi\.resetAllMocks\(\)/g, 'mock.restore()')
      .replace(/vi\.fn\(/g, 'mock(')
      .replace(/vi\.mock\(/g, 'mock.module(')
      .replace(/vi\.spyOn\(/g, 'mock.spyOn(')
      .replace(/vi\./g, 'mock.')

    // Add proper imports at the top
    const lines = updatedContent.split('\n')
    const importIndex = lines.findIndex((line) => line.includes('import') && line.includes('from'))

    if (importIndex !== -1) {
      // Add bun:test import
      lines.splice(
        importIndex,
        0,
        'import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"'
      )
    } else {
      // Add at the beginning
      lines.unshift(
        'import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"'
      )
    }

    updatedContent = lines.join('\n')

    await writeFile(filePath, updatedContent, 'utf-8')
    console.log(`✓ Fixed ${filePath}`)
  } catch (error) {
    console.error(`✗ Failed to fix ${filePath}:`, error)
  }
}

async function findAndFixUnitTests(): Promise<void> {
  const testDirs = ['lib', 'hooks', 'components', 'app', 'src', 'stores']

  for (const dir of testDirs) {
    try {
      const files = await readdir(join(PROJECT_ROOT, dir), { recursive: true })

      for (const file of files) {
        if (
          typeof file === 'string' &&
          file.endsWith('.test.ts') &&
          !file.includes('integration')
        ) {
          await fixBunTestImports(join(PROJECT_ROOT, dir, file))
        }
      }
    } catch (error) {
      console.warn(`Skipping directory ${dir}:`, error)
    }
  }
}

async function main(): Promise<void> {
  console.log('🔧 Fixing Bun test imports...')
  await findAndFixUnitTests()
  console.log('✅ Fixed Bun test imports')
}

if (import.meta.main) {
  main()
}
