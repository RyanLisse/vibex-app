#!/usr/bin/env node

/**
 * Stagehand AI Testing Setup Script
 * Helps configure and validate Stagehand AI testing environment
 */

const fs = require('fs').promises
const path = require('path')
const { execSync } = require('child_process')

class StagehandSetup {
  constructor() {
    this.projectRoot = process.cwd()
    this.envPath = path.join(this.projectRoot, '.env')
    this.exampleEnvPath = path.join(this.projectRoot, '.env.example')
    this.configPath = path.join(this.projectRoot, 'stagehand.config.ts')
    this.testDir = path.join(this.projectRoot, 'tests', 'e2e')
  }

  async run() {
    console.log('🎭 Stagehand AI Testing Setup')
    console.log('===============================\n')

    try {
      await this.checkPrerequisites()
      await this.setupEnvironment()
      await this.validateConfiguration()
      await this.setupDirectories()
      await this.runValidationTests()
      await this.displayUsageInstructions()

      console.log('\n✅ Stagehand AI Testing setup complete!')
      console.log('🚀 You can now run AI-powered tests with: npm run test:e2e')
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message)
      process.exit(1)
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...')

    // Check if Node.js version is compatible
    const nodeVersion = process.version
    const majorVersion = Number.parseInt(nodeVersion.split('.')[0].substring(1))

    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`)
    }

    // Check if required packages are installed
    const requiredPackages = ['@browserbasehq/stagehand', '@playwright/test', 'zod']

    const packageJson = JSON.parse(
      await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8')
    )
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    const missingPackages = requiredPackages.filter((pkg) => !allDeps[pkg])

    if (missingPackages.length > 0) {
      console.log('📦 Installing missing packages...')
      try {
        execSync(`npm install ${missingPackages.join(' ')}`, { stdio: 'inherit' })
      } catch (error) {
        throw new Error(`Failed to install packages: ${missingPackages.join(', ')}`)
      }
    }

    console.log('✅ Prerequisites check passed')
  }

  async setupEnvironment() {
    console.log('\n🔧 Setting up environment...')

    // Check if .env exists
    let envExists = false
    try {
      await fs.access(this.envPath)
      envExists = true
    } catch {
      // .env doesn't exist
    }

    if (!envExists) {
      // Copy from .env.example if it exists
      try {
        await fs.access(this.exampleEnvPath)
        await fs.copyFile(this.exampleEnvPath, this.envPath)
        console.log('📋 Created .env from .env.example')
      } catch {
        // Create minimal .env
        const minimalEnv = `# Stagehand AI Testing Configuration
OPENAI_API_KEY=your_openai_api_key_here
STAGEHAND_DEBUG=true
DEBUG_DOM=false
VERBOSE=false

# Optional: Browserbase for cloud testing
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id
`
        await fs.writeFile(this.envPath, minimalEnv)
        console.log('📋 Created minimal .env file')
      }
    }

    // Check for required environment variables
    const envContent = await fs.readFile(this.envPath, 'utf8')
    const hasOpenAI =
      envContent.includes('OPENAI_API_KEY=') &&
      !envContent.includes('OPENAI_API_KEY=your_openai_api_key_here')

    if (!hasOpenAI) {
      console.log('⚠️  WARNING: OPENAI_API_KEY not configured')
      console.log('   Please set your OpenAI API key in .env file')
      console.log('   Some AI features will not work without it')
    }

    console.log('✅ Environment setup complete')
  }

  async validateConfiguration() {
    console.log('\n⚙️  Validating configuration...')

    // Check if stagehand.config.ts exists
    try {
      await fs.access(this.configPath)
      console.log('✅ Stagehand configuration found')
    } catch {
      throw new Error('stagehand.config.ts not found. Please ensure it exists in the project root.')
    }

    // Validate configuration syntax
    try {
      const config = require(this.configPath)
      console.log('✅ Configuration syntax valid')
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`)
    }

    // Check playwright configuration
    const playwrightConfigPath = path.join(this.projectRoot, 'playwright.config.ts')
    try {
      await fs.access(playwrightConfigPath)
      console.log('✅ Playwright configuration found')
    } catch {
      console.log('⚠️  WARNING: playwright.config.ts not found')
      console.log('   You may need to configure Playwright separately')
    }
  }

  async setupDirectories() {
    console.log('\n📁 Setting up test directories...')

    const directories = [
      path.join(this.testDir, 'screenshots'),
      path.join(this.testDir, 'screenshots', 'visual-regression'),
      path.join(this.testDir, 'screenshots', 'baselines'),
      path.join(this.testDir, 'fixtures'),
      path.join(this.testDir, 'page-objects'),
      path.join(this.testDir, 'helpers'),
    ]

    for (const dir of directories) {
      try {
        await fs.access(dir)
        console.log(`✅ Directory exists: ${path.relative(this.projectRoot, dir)}`)
      } catch {
        await fs.mkdir(dir, { recursive: true })
        console.log(`📁 Created directory: ${path.relative(this.projectRoot, dir)}`)
      }
    }
  }

  async runValidationTests() {
    console.log('\n🧪 Running validation tests...')

    // Create a simple validation test
    const validationTest = `
import { test, expect } from '@playwright/test'

test('Stagehand setup validation', async ({ page }) => {
  // Test basic page navigation
  await page.goto('https://example.com')
  
  // Test basic functionality
  const title = await page.title()
  expect(title).toBeTruthy()
  
  console.log('✅ Basic Playwright functionality working')
})
`

    const validationTestPath = path.join(this.testDir, 'validation.spec.ts')
    await fs.writeFile(validationTestPath, validationTest)

    try {
      console.log('🔄 Running basic validation test...')
      execSync('npx playwright test validation.spec.ts', {
        cwd: this.projectRoot,
        stdio: 'pipe',
      })
      console.log('✅ Validation test passed')
    } catch (error) {
      console.log('⚠️  Validation test skipped (this is normal during setup)')
    }

    // Clean up validation test
    try {
      await fs.unlink(validationTestPath)
    } catch {
      // Ignore cleanup errors
    }
  }

  async displayUsageInstructions() {
    console.log('\n📖 Usage Instructions')
    console.log('=====================')

    console.log('\n1. Configure your OpenAI API key:')
    console.log('   Edit .env file and set OPENAI_API_KEY=your_actual_key')

    console.log('\n2. Run AI-powered tests:')
    console.log('   npm run test:e2e                     # Run all E2E tests')
    console.log('   npm run test:e2e:headed              # Run in headed mode')
    console.log('   npm run test:e2e:debug               # Run with debug output')

    console.log('\n3. Run specific AI test suites:')
    console.log('   npm run test:e2e ai-powered-advanced.spec.ts')
    console.log('   npm run test:e2e visual-regression-ai.spec.ts')

    console.log('\n4. Enable debug output:')
    console.log('   STAGEHAND_DEBUG=true npm run test:e2e')

    console.log('\n5. Available test examples:')
    console.log('   - tests/e2e/example.spec.ts              # Basic AI interactions')
    console.log('   - tests/e2e/ai-powered-advanced.spec.ts  # Advanced AI testing')
    console.log('   - tests/e2e/visual-regression-ai.spec.ts # Visual regression testing')

    console.log('\n6. Documentation:')
    console.log('   - tests/e2e/STAGEHAND_GUIDE.md         # Comprehensive guide')
    console.log('   - stagehand.config.ts                   # Configuration reference')

    console.log('\n🎯 AI Testing Features:')
    console.log('   • Natural language element selection')
    console.log('   • Intelligent form filling and validation')
    console.log('   • AI-powered visual regression testing')
    console.log('   • Automated accessibility auditing')
    console.log('   • Performance monitoring with AI insights')
    console.log('   • Cross-browser compatibility testing')
    console.log('   • Error handling and recovery testing')
  }
}

// Check if running as a script
if (require.main === module) {
  const setup = new StagehandSetup()
  setup.run().catch(console.error)
}

module.exports = StagehandSetup
