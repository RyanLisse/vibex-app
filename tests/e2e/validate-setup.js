#!/usr/bin/env node

/**
 * Validation script for E2E testing setup
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Validating E2E Testing Setup...\n')

// Check if required files exist
const requiredFiles = [
  'playwright.config.ts',
  'tests/e2e/fixtures/base.fixture.ts',
  'tests/e2e/stagehand.config.ts',
  'tests/e2e/page-objects/base.page.ts',
  'tests/e2e/page-objects/home.page.ts',
  'tests/e2e/page-objects/environments.page.ts',
  'tests/e2e/page-objects/task.page.ts',
  'tests/e2e/specs/home.spec.ts',
  'tests/e2e/specs/environments.spec.ts',
  'tests/e2e/specs/task.spec.ts',
  'tests/e2e/specs/integration.spec.ts',
  'tests/e2e/example.spec.ts',
  'tests/e2e/helpers/test-utils.ts',
  'tests/e2e/README.md',
]

const requiredDirectories = [
  'tests/e2e/fixtures',
  'tests/e2e/page-objects',
  'tests/e2e/specs',
  'tests/e2e/helpers',
  'tests/e2e/screenshots',
]

let allFilesExist = true
let allDirectoriesExist = true

// Check directories
console.log('📁 Checking directories...')
requiredDirectories.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${dir}`)
  } else {
    console.log(`  ❌ ${dir} - MISSING`)
    allDirectoriesExist = false
  }
})

// Check files
console.log('\n📄 Checking files...')
requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`)
  } else {
    console.log(`  ❌ ${file} - MISSING`)
    allFilesExist = false
  }
})

// Check package.json for required dependencies
console.log('\n📦 Checking dependencies...')
const packageJsonPath = 'package.json'
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  const requiredDeps = ['@playwright/test', 'playwright', 'stagehand']

  requiredDeps.forEach((dep) => {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`  ✅ ${dep}`)
    } else {
      console.log(`  ❌ ${dep} - MISSING`)
      allFilesExist = false
    }
  })

  // Check scripts
  console.log('\n🔧 Checking scripts...')
  const requiredScripts = ['test:e2e', 'test:e2e:headed', 'test:e2e:debug']

  requiredScripts.forEach((script) => {
    if (packageJson.scripts?.[script]) {
      console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`)
    } else {
      console.log(`  ❌ ${script} - MISSING`)
      allFilesExist = false
    }
  })
} else {
  console.log('  ❌ package.json - MISSING')
  allFilesExist = false
}

// Check environment variables
console.log('\n🌍 Checking environment setup...')
const envFiles = ['.env.local', '.env']
let hasEnvFile = false

envFiles.forEach((envFile) => {
  if (fs.existsSync(envFile)) {
    console.log(`  ✅ ${envFile} found`)
    hasEnvFile = true

    // Check for OpenAI API key
    const envContent = fs.readFileSync(envFile, 'utf8')
    if (envContent.includes('OPENAI_API_KEY')) {
      console.log(`  ✅ OPENAI_API_KEY configured in ${envFile}`)
    } else {
      console.log(`  ⚠️  OPENAI_API_KEY not found in ${envFile}`)
    }
  }
})

if (!hasEnvFile) {
  console.log('  ⚠️  No environment file found (.env.local or .env)')
  console.log('  ⚠️  You may need to set OPENAI_API_KEY for AI features')
}

// Summary
console.log('\n📊 Summary:')
console.log(`  Directories: ${allDirectoriesExist ? '✅ All present' : '❌ Some missing'}`)
console.log(`  Files: ${allFilesExist ? '✅ All present' : '❌ Some missing'}`)
console.log(`  Environment: ${hasEnvFile ? '✅ Configured' : '⚠️  Needs setup'}`)

if (allFilesExist && allDirectoriesExist) {
  console.log('\n🎉 E2E Testing setup is complete!')
  console.log('\nNext steps:')
  console.log('1. Set up environment variables (OPENAI_API_KEY)')
  console.log('2. Install Playwright browsers: npx playwright install')
  console.log('3. Run tests: npm run test:e2e')
  console.log('4. Try AI examples: npx playwright test tests/e2e/example.spec.ts')
} else {
  console.log('\n❌ E2E Testing setup is incomplete!')
  console.log('Please check the missing files and directories above.')
  process.exit(1)
}

// Test configuration validation
console.log('\n🔧 Validating configurations...')
try {
  // Check if playwright.config.ts is valid
  const playwrightConfig = fs.readFileSync('playwright.config.ts', 'utf8')
  if (playwrightConfig.includes("testDir: './tests/e2e'")) {
    console.log('  ✅ Playwright config points to correct test directory')
  } else {
    console.log('  ⚠️  Playwright config may need adjustment')
  }

  // Check if stagehand config exists
  const stagehandConfig = fs.readFileSync('tests/e2e/stagehand.config.ts', 'utf8')
  if (stagehandConfig.includes('OPENAI_API_KEY')) {
    console.log('  ✅ Stagehand config references OpenAI API key')
  } else {
    console.log('  ⚠️  Stagehand config may need API key setup')
  }
} catch (error) {
  console.log('  ❌ Error validating configurations:', error.message)
}

console.log('\n✨ Validation complete!')
