#!/usr/bin/env bun
/**
 * Test Migration Script
 * Migrates existing tests to the new multi-tier structure
 */

import { promises as fs } from 'fs'
import { glob } from 'glob'
import path from 'path'

interface TestFile {
  path: string
  content: string
  category: 'unit' | 'integration' | 'component' | 'e2e'
  newPath: string
}

interface MigrationReport {
  totalFiles: number
  migratedFiles: number
  errors: string[]
  warnings: string[]
  categories: Record<string, number>
}

const projectRoot = process.cwd()
const testDirs = {
  unit: path.join(projectRoot, 'tests/unit'),
  integration: path.join(projectRoot, 'tests/integration'),
  component: path.join(projectRoot, 'tests/component'),
  e2e: path.join(projectRoot, 'tests/e2e'),
}

/**
 * Categorize test based on file path and content
 */
function categorizeTest(
  filePath: string,
  content: string
): 'unit' | 'integration' | 'component' | 'e2e' {
  const normalizedPath = filePath.toLowerCase()

  // E2E tests
  if (
    normalizedPath.includes('e2e/') ||
    normalizedPath.includes('.e2e.') ||
    normalizedPath.includes('playwright')
  ) {
    return 'e2e'
  }

  // Integration tests
  if (
    normalizedPath.includes('integration/') ||
    normalizedPath.includes('.integration.') ||
    normalizedPath.includes('api/') ||
    normalizedPath.includes('actions/') ||
    content.includes('fetch(') ||
    content.includes('TestingLibrary') ||
    content.includes('supertest') ||
    content.includes('request(')
  ) {
    return 'integration'
  }

  // Component tests
  if (
    normalizedPath.includes('components/') ||
    normalizedPath.includes('app/') ||
    normalizedPath.includes('task/') ||
    content.includes('render(') ||
    content.includes('@testing-library/react') ||
    content.includes('screen.') ||
    content.includes('userEvent') ||
    content.includes('fireEvent')
  ) {
    return 'component'
  }

  // Default to unit tests
  return 'unit'
}

/**
 * Generate new file path based on category
 */
function generateNewPath(originalPath: string, category: string): string {
  const relativePath = path.relative(projectRoot, originalPath)
  const fileName = path.basename(relativePath)

  // Extract meaningful directory structure
  let subDir = ''
  if (relativePath.includes('components/')) {
    subDir = 'components/'
  } else if (relativePath.includes('hooks/')) {
    subDir = 'hooks/'
  } else if (relativePath.includes('lib/')) {
    subDir = 'lib/'
  } else if (relativePath.includes('app/')) {
    subDir = 'app/'
  } else if (relativePath.includes('src/')) {
    subDir = 'src/'
  } else if (relativePath.includes('api/')) {
    subDir = 'api/'
  } else if (relativePath.includes('actions/')) {
    subDir = 'actions/'
  }

  return path.join(testDirs[category as keyof typeof testDirs], subDir, fileName)
}

/**
 * Update import paths in test files
 */
function updateImportPaths(content: string, oldPath: string, newPath: string): string {
  let updatedContent = content

  // Calculate relative path changes
  const oldDir = path.dirname(oldPath)
  const newDir = path.dirname(newPath)
  const oldRelative = path.relative(projectRoot, oldDir)
  const newRelative = path.relative(projectRoot, newDir)

  // Update relative imports
  const importRegex = /from\s+['"]([^'"]+)['"]/g
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g

  updatedContent = updatedContent.replace(importRegex, (match, importPath) => {
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Calculate new relative path
      const absolutePath = path.resolve(oldDir, importPath)
      const newRelativePath = path.relative(newDir, absolutePath)
      return match.replace(importPath, newRelativePath)
    }
    return match
  })

  updatedContent = updatedContent.replace(requireRegex, (match, importPath) => {
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Calculate new relative path
      const absolutePath = path.resolve(oldDir, importPath)
      const newRelativePath = path.relative(newDir, absolutePath)
      return match.replace(importPath, newRelativePath)
    }
    return match
  })

  // Update test setup imports
  if (updatedContent.includes('./vitest.setup.ts')) {
    const setupPath = path.relative(newDir, path.join(projectRoot, 'tests/setup'))
    const category = path.basename(path.dirname(newPath))
    updatedContent = updatedContent.replace('./vitest.setup.ts', `${setupPath}/${category}.ts`)
  }

  return updatedContent
}

/**
 * Create directory if it doesn't exist
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Find all test files
 */
async function findTestFiles(): Promise<string[]> {
  const patterns = ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}']

  const options = {
    cwd: projectRoot,
    ignore: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.next/**',
      'tests/e2e/**', // Keep e2e tests in place
    ],
  }

  return await glob(patterns, options)
}

/**
 * Migrate test files
 */
async function migrateTests(): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalFiles: 0,
    migratedFiles: 0,
    errors: [],
    warnings: [],
    categories: { unit: 0, integration: 0, component: 0, e2e: 0 },
  }

  try {
    // Find all test files
    const testFiles = await findTestFiles()
    report.totalFiles = testFiles.length

    console.log(`Found ${testFiles.length} test files to migrate`)

    // Ensure test directories exist
    await Promise.all(Object.values(testDirs).map((dir) => ensureDir(dir)))

    // Process each test file
    for (const filePath of testFiles) {
      try {
        const fullPath = path.join(projectRoot, filePath)
        const content = await fs.readFile(fullPath, 'utf-8')

        // Categorize the test
        const category = categorizeTest(filePath, content)
        const newPath = generateNewPath(fullPath, category)

        // Update import paths
        const updatedContent = updateImportPaths(content, fullPath, newPath)

        // Create directory for new file
        await ensureDir(path.dirname(newPath))

        // Write the migrated file
        await fs.writeFile(newPath, updatedContent, 'utf-8')

        // Update counters
        report.categories[category]++
        report.migratedFiles++

        console.log(`✓ Migrated ${filePath} → ${path.relative(projectRoot, newPath)} (${category})`)

        // Remove original file if it's not in the new location
        if (fullPath !== newPath) {
          await fs.unlink(fullPath)
        }
      } catch (error) {
        const errorMsg = `Failed to migrate ${filePath}: ${error}`
        report.errors.push(errorMsg)
        console.error(`✗ ${errorMsg}`)
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`Total files: ${report.totalFiles}`)
    console.log(`Migrated files: ${report.migratedFiles}`)
    console.log(`Errors: ${report.errors.length}`)
    console.log('\nCategory breakdown:')
    Object.entries(report.categories).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`  ${category}: ${count} files`)
      }
    })

    if (report.errors.length > 0) {
      console.log('\n❌ Errors:')
      report.errors.forEach((error) => console.log(`  - ${error}`))
    }

    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      report.warnings.forEach((warning) => console.log(`  - ${warning}`))
    }

    return report
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

/**
 * Validate migration
 */
async function validateMigration(): Promise<void> {
  console.log('\n🔍 Validating migration...')

  // Check that all directories exist
  for (const [category, dir] of Object.entries(testDirs)) {
    try {
      await fs.access(dir)
      const files = await fs.readdir(dir, { recursive: true })
      const testFiles = files.filter(
        (file) => typeof file === 'string' && file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)
      )
      console.log(`✓ ${category}: ${testFiles.length} test files`)
    } catch (error) {
      console.log(`⚠️  ${category}: directory not found or empty`)
    }
  }

  // Check that vitest config exists
  try {
    await fs.access(path.join(projectRoot, 'vitest.config.multi-tier.ts'))
    console.log('✓ Multi-tier Vitest config found')
  } catch (error) {
    console.log('⚠️  Multi-tier Vitest config not found')
  }

  // Check that test setup files exist
  for (const category of ['unit', 'integration', 'component']) {
    try {
      await fs.access(path.join(projectRoot, `tests/setup/${category}.ts`))
      console.log(`✓ ${category} setup file found`)
    } catch (error) {
      console.log(`⚠️  ${category} setup file not found`)
    }
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting test migration...\n')

    const report = await migrateTests()
    await validateMigration()

    console.log('\n✅ Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Review migrated test files')
    console.log('2. Run tests to verify functionality')
    console.log('3. Update CI/CD configuration')
    console.log('4. Update documentation')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

if (import.meta.main) {
  main()
}
