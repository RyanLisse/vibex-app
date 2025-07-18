#!/usr/bin/env bun

/**
 * Test Migration Script
 * Migrates existing tests to the new multi-tiered structure:
 * - Unit tests → Bun test runner
 * - Integration tests → renamed with .integration.test.ts suffix
 * - E2E tests → remain in e2e/ directory
 */

import { readdir, readFile, writeFile, rename, stat } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { execSync } from 'child_process'

interface TestFile {
  path: string
  name: string
  type: 'unit' | 'integration' | 'e2e'
  runner: 'bun' | 'vitest' | 'playwright'
}

interface MigrationPlan {
  unitTests: TestFile[]
  integrationTests: TestFile[]
  e2eTests: TestFile[]
  filesToRename: Array<{ from: string; to: string }>
  filesToUpdate: Array<{ path: string; updates: string[] }>
}

const PROJECT_ROOT = process.cwd()
const UNIT_TEST_DIRS = ['app', 'components', 'lib', 'hooks', 'src', 'stores']
const INTEGRATION_TEST_DIRS = ['tests/integration']
const E2E_TEST_DIRS = ['tests/e2e', 'e2e']

async function getAllTestFiles(): Promise<TestFile[]> {
  const testFiles: TestFile[] = []
  
  // Find all test files recursively
  const findTestFiles = async (dir: string, currentPath: string = ''): Promise<void> => {
    const fullPath = join(PROJECT_ROOT, dir, currentPath)
    
    try {
      const items = await readdir(fullPath, { withFileTypes: true })
      
      for (const item of items) {
        const itemPath = join(currentPath, item.name)
        
        if (item.isDirectory() && !item.name.includes('node_modules')) {
          await findTestFiles(dir, itemPath)
        } else if (item.isFile()) {
          const ext = extname(item.name)
          const nameWithoutExt = basename(item.name, ext)
          
          if (nameWithoutExt.includes('.test') || nameWithoutExt.includes('.spec')) {
            const fullFilePath = join(dir, itemPath)
            
            let type: 'unit' | 'integration' | 'e2e' = 'unit'
            let runner: 'bun' | 'vitest' | 'playwright' = 'bun'
            
            if (E2E_TEST_DIRS.some(e2eDir => fullFilePath.startsWith(e2eDir))) {
              type = 'e2e'
              runner = 'playwright'
            } else if (INTEGRATION_TEST_DIRS.some(intDir => fullFilePath.startsWith(intDir))) {
              type = 'integration'
              runner = 'vitest'
            } else if (fullFilePath.includes('integration') || nameWithoutExt.includes('integration')) {
              type = 'integration'
              runner = 'vitest'
            }
            
            testFiles.push({
              path: fullFilePath,
              name: item.name,
              type,
              runner
            })
          }
        }
      }
    } catch (error) {
      // Skip directories that don't exist or can't be read
      console.warn(`Skipping directory ${fullPath}: ${error}`)
    }
  }
  
  // Search in all relevant directories
  for (const dir of [...UNIT_TEST_DIRS, ...INTEGRATION_TEST_DIRS, ...E2E_TEST_DIRS]) {
    await findTestFiles(dir)
  }
  
  return testFiles
}

async function createMigrationPlan(testFiles: TestFile[]): Promise<MigrationPlan> {
  const plan: MigrationPlan = {
    unitTests: [],
    integrationTests: [],
    e2eTests: [],
    filesToRename: [],
    filesToUpdate: []
  }
  
  for (const file of testFiles) {
    switch (file.type) {
      case 'unit':
        plan.unitTests.push(file)
        break
      case 'integration':
        plan.integrationTests.push(file)
        // Check if it needs renaming to .integration.test.ts
        if (!file.name.includes('.integration.test.')) {
          const newName = file.name.replace('.test.', '.integration.test.')
          const newPath = file.path.replace(file.name, newName)
          plan.filesToRename.push({ from: file.path, to: newPath })
        }
        break
      case 'e2e':
        plan.e2eTests.push(file)
        break
    }
    
    // All files need import updates
    plan.filesToUpdate.push({
      path: file.path,
      updates: ['imports', 'syntax']
    })
  }
  
  return plan
}

async function updateTestImports(filePath: string, testType: 'unit' | 'integration' | 'e2e'): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    let updatedContent = content
    
    if (testType === 'unit') {
      // Update imports for Bun test runner
      updatedContent = updatedContent
        .replace(/import.*from ['"]vitest['"].*\n/g, '')
        .replace(/import.*from ['"]vitest\/config['"].*\n/g, '')
        .replace(/import { test, expect, describe, it, beforeEach, afterEach, vi } from ['"]vitest['"];?\n/g, 
                'import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test";\n')
        .replace(/import { expect, test, describe, it, beforeEach, afterEach, vi } from ['"]vitest['"];?\n/g, 
                'import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test";\n')
        .replace(/import { vi } from ['"]vitest['"];?\n/g, 'import { mock } from "bun:test";\n')
        .replace(/vi\.mock/g, 'mock')
        .replace(/vi\.fn/g, 'mock')
        .replace(/vi\.spyOn/g, 'mock.spyOn')
        .replace(/vi\.clearAllMocks/g, 'mock.restore')
        .replace(/vi\.resetAllMocks/g, 'mock.restore')
    } else if (testType === 'integration') {
      // Keep vitest imports for integration tests
      if (!content.includes('import') || !content.includes('vitest')) {
        updatedContent = `import { test, expect, describe, it, beforeEach, afterEach, vi } from "vitest";\n${updatedContent}`
      }
    }
    
    // Update @testing-library imports to be consistent
    updatedContent = updatedContent
      .replace(/import { render, screen, fireEvent, waitFor } from ['"]@testing-library\/react['"];?\n/g,
              'import { render, screen, fireEvent, waitFor } from "@testing-library/react";\n')
      .replace(/import { userEvent } from ['"]@testing-library\/user-event['"];?\n/g,
              'import userEvent from "@testing-library/user-event";\n')
    
    await writeFile(filePath, updatedContent, 'utf-8')
    console.log(`✓ Updated imports for ${filePath}`)
  } catch (error) {
    console.error(`✗ Failed to update ${filePath}:`, error)
  }
}

async function renameTestFiles(filesToRename: Array<{ from: string; to: string }>): Promise<void> {
  for (const { from, to } of filesToRename) {
    try {
      await rename(from, to)
      console.log(`✓ Renamed ${from} → ${to}`)
    } catch (error) {
      console.error(`✗ Failed to rename ${from} → ${to}:`, error)
    }
  }
}

async function createBunTestConfig(): Promise<void> {
  const bunTestConfig = `// Bun test configuration
import { test, expect, describe, it, beforeEach, afterEach } from "bun:test";

// Setup file for Bun tests
beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Mock Next.js router for Bun tests
import { mock } from "bun:test";

mock.module("next/router", () => ({
  useRouter: () => ({
    push: mock(),
    pathname: "/",
    query: {},
    asPath: "/",
    route: "/",
  }),
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock(),
    replace: mock(),
    back: mock(),
  }),
  useSearchParams: () => ({
    get: mock(),
  }),
  usePathname: () => "/",
}));

export { test, expect, describe, it, beforeEach, afterEach };
`
  
  await writeFile(join(PROJECT_ROOT, 'bun-test.setup.ts'), bunTestConfig, 'utf-8')
  console.log('✓ Created Bun test configuration')
}

async function updatePackageJsonScripts(): Promise<void> {
  const packageJsonPath = join(PROJECT_ROOT, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
  
  // Update test scripts for multi-tiered testing
  packageJson.scripts = {
    ...packageJson.scripts,
    "test:unit": "bun test --coverage",
    "test:unit:watch": "bun test --watch",
    "test:integration": "vitest run tests/integration --coverage",
    "test:integration:watch": "vitest run tests/integration --watch",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "bun run test:unit && bun run test:integration && bun run test:e2e",
    "test:coverage": "bun run test:unit --coverage && bun run test:integration --coverage",
    "test:coverage:merge": "node scripts/merge-coverage.js"
  }
  
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')
  console.log('✓ Updated package.json scripts')
}

async function createCoverageMergeScript(): Promise<void> {
  const coverageMergeScript = `#!/usr/bin/env node

/**
 * Merge coverage reports from different test tiers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function mergeCoverage() {
  console.log('Merging coverage reports...');
  
  try {
    // Merge coverage reports if they exist
    const coverageDir = path.join(__dirname, '..', 'coverage');
    const bunCoverageDir = path.join(coverageDir, 'bun');
    const vitestCoverageDir = path.join(coverageDir, 'vitest');
    
    if (fs.existsSync(bunCoverageDir) && fs.existsSync(vitestCoverageDir)) {
      console.log('Found coverage reports from both Bun and Vitest');
      
      // Use nyc to merge coverage reports
      execSync('npx nyc merge coverage/bun coverage/vitest coverage/merged', { stdio: 'inherit' });
      execSync('npx nyc report --reporter=html --reporter=lcov --temp-dir=coverage/merged --report-dir=coverage/merged-report', { stdio: 'inherit' });
      
      console.log('✓ Coverage reports merged successfully');
    } else {
      console.log('Coverage reports not found for merging');
    }
  } catch (error) {
    console.error('✗ Failed to merge coverage reports:', error.message);
  }
}

mergeCoverage();
`
  
  await writeFile(join(PROJECT_ROOT, 'scripts/merge-coverage.js'), coverageMergeScript, 'utf-8')
  console.log('✓ Created coverage merge script')
}

async function main(): Promise<void> {
  console.log('🚀 Starting test migration...')
  
  try {
    // Step 1: Analyze current test structure
    console.log('\n📊 Analyzing current test structure...')
    const testFiles = await getAllTestFiles()
    console.log(`Found ${testFiles.length} test files`)
    
    // Step 2: Create migration plan
    console.log('\n📋 Creating migration plan...')
    const plan = await createMigrationPlan(testFiles)
    console.log(`Unit tests: ${plan.unitTests.length}`)
    console.log(`Integration tests: ${plan.integrationTests.length}`)
    console.log(`E2E tests: ${plan.e2eTests.length}`)
    console.log(`Files to rename: ${plan.filesToRename.length}`)
    
    // Step 3: Create Bun test configuration
    console.log('\n⚙️  Creating Bun test configuration...')
    await createBunTestConfig()
    
    // Step 4: Update package.json scripts
    console.log('\n📦 Updating package.json scripts...')
    await updatePackageJsonScripts()
    
    // Step 5: Create coverage merge script
    console.log('\n📊 Creating coverage merge script...')
    await createCoverageMergeScript()
    
    // Step 6: Rename integration test files
    console.log('\n🔄 Renaming integration test files...')
    await renameTestFiles(plan.filesToRename)
    
    // Step 7: Update imports in all test files
    console.log('\n🔧 Updating test imports...')
    for (const file of plan.filesToUpdate) {
      let filePath = file.path
      
      // Update path if file was renamed
      const renameEntry = plan.filesToRename.find(r => r.from === filePath)
      if (renameEntry) {
        filePath = renameEntry.to
      }
      
      const testType = plan.unitTests.find(t => t.path === file.path) ? 'unit' :
                      plan.integrationTests.find(t => t.path === file.path) ? 'integration' : 'e2e'
      
      await updateTestImports(filePath, testType)
    }
    
    console.log('\n✅ Test migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Run: bun run test:unit - to test unit tests with Bun')
    console.log('2. Run: bun run test:integration - to test integration tests with Vitest')
    console.log('3. Run: bun run test:e2e - to test e2e tests with Playwright')
    console.log('4. Run: bun run test:all - to run all test tiers')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

if (import.meta.main) {
  main()
}