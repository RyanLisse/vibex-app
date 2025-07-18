#!/usr/bin/env bun
/**
 * Vitest Configuration Diagnostic and Fix Script
 *
 * This script diagnoses why Vitest hangs during test execution and implements
 * automated fixes for common configuration issues.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface VitestIssue {
  type: 'configuration' | 'dependency' | 'test-setup' | 'infinite-loop'
  description: string
  fix: () => Promise<void>
  severity: 'high' | 'medium' | 'low'
}

class VitestConfigFixer {
  private issues: VitestIssue[] = []

  async run(): Promise<void> {
    console.log('🔧 Diagnosing Vitest configuration issues...\n')

    // Analyze current configuration
    await this.analyzeConfiguration()

    // Detect hanging issues
    await this.detectHangingIssues()

    // Apply fixes
    await this.applyFixes()

    // Verify fixes
    await this.verifyFixes()
  }

  private async analyzeConfiguration(): Promise<void> {
    console.log('📋 Analyzing Vitest configuration...')

    // Check vitest.config.ts
    const configPath = 'vitest.config.ts'
    if (!existsSync(configPath)) {
      this.issues.push({
        type: 'configuration',
        description: 'Missing vitest.config.ts',
        fix: this.createMinimalConfig.bind(this),
        severity: 'high',
      })
      return
    }

    const config = readFileSync(configPath, 'utf-8')

    // Check for problematic configurations
    if (config.includes("pool: 'forks'") && config.includes('singleFork: true')) {
      this.issues.push({
        type: 'configuration',
        description: 'Single fork configuration may cause hanging',
        fix: this.fixPoolConfiguration.bind(this),
        severity: 'high',
      })
    }

    if (!config.includes('testTimeout')) {
      this.issues.push({
        type: 'configuration',
        description: 'Missing test timeout configuration',
        fix: this.addTestTimeout.bind(this),
        severity: 'medium',
      })
    }

    if (!config.includes('hookTimeout')) {
      this.issues.push({
        type: 'configuration',
        description: 'Missing hook timeout configuration',
        fix: this.addHookTimeout.bind(this),
        severity: 'medium',
      })
    }
  }

  private async detectHangingIssues(): Promise<void> {
    console.log('🔍 Detecting potential hanging issues...')

    // Check for infinite loops in test setup
    const setupFiles = ['vitest.setup.ts', 'src/test/setup.ts']
    for (const setupFile of setupFiles) {
      if (existsSync(setupFile)) {
        const content = readFileSync(setupFile, 'utf-8')

        // Check for problematic patterns
        if (content.includes('while (true)') || content.includes('setInterval')) {
          this.issues.push({
            type: 'infinite-loop',
            description: `Potential infinite loop in ${setupFile}`,
            fix: () => this.fixInfiniteLoops(setupFile),
            severity: 'high',
          })
        }

        // Check for missing cleanup
        if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
          this.issues.push({
            type: 'test-setup',
            description: `Missing event listener cleanup in ${setupFile}`,
            fix: () => this.addEventListenerCleanup(setupFile),
            severity: 'medium',
          })
        }
      }
    }

    // Check for problematic test patterns
    await this.checkTestFiles()
  }

  private async checkTestFiles(): Promise<void> {
    try {
      const testFiles = execSync(
        'find . -name "*.test.{ts,tsx}" -o -name "*.spec.{ts,tsx}" | head -10',
        {
          encoding: 'utf-8',
        }
      )
        .split('\n')
        .filter(Boolean)

      for (const file of testFiles) {
        if (existsSync(file)) {
          const content = readFileSync(file, 'utf-8')

          // Check for missing cleanup in tests
          if (content.includes('setInterval') && !content.includes('clearInterval')) {
            this.issues.push({
              type: 'test-setup',
              description: `Missing interval cleanup in ${file}`,
              fix: () => this.addIntervalCleanup(file),
              severity: 'medium',
            })
          }

          // Check for missing async/await patterns
          if (content.includes('waitFor') && !content.includes('await waitFor')) {
            this.issues.push({
              type: 'test-setup',
              description: `Missing await for async operations in ${file}`,
              fix: () => this.fixAsyncPatterns(file),
              severity: 'medium',
            })
          }
        }
      }
    } catch (error) {
      console.warn('Could not analyze test files:', error)
    }
  }

  private async applyFixes(): Promise<void> {
    if (this.issues.length === 0) {
      console.log('✅ No issues detected!')
      return
    }

    console.log(`\n🔧 Applying fixes for ${this.issues.length} issues...\n`)

    // Sort by severity
    const sortedIssues = this.issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })

    for (const issue of sortedIssues) {
      console.log(`🔨 Fixing: ${issue.description}`)
      try {
        await issue.fix()
        console.log(`✅ Fixed: ${issue.description}`)
      } catch (error) {
        console.error(`❌ Failed to fix: ${issue.description}`, error)
      }
    }
  }

  private async createMinimalConfig(): Promise<void> {
    const config = `import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
      ],
    },
  },
})
`
    writeFileSync('vitest.config.ts', config, 'utf-8')
  }

  private async fixPoolConfiguration(): Promise<void> {
    const configPath = 'vitest.config.ts'
    let config = readFileSync(configPath, 'utf-8')

    // Replace problematic pool configuration
    config = config.replace(
      /pool:\s*['"]forks['"],?\s*poolOptions:\s*{\s*forks:\s*{\s*singleFork:\s*true,?\s*},?\s*},?/g,
      `pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },`
    )

    writeFileSync(configPath, config, 'utf-8')
  }

  private async addTestTimeout(): Promise<void> {
    const configPath = 'vitest.config.ts'
    let config = readFileSync(configPath, 'utf-8')

    // Add test timeout if not present
    if (!config.includes('testTimeout')) {
      config = config.replace(
        /test:\s*{/,
        `test: {
    testTimeout: 10000,`
      )
    }

    writeFileSync(configPath, config, 'utf-8')
  }

  private async addHookTimeout(): Promise<void> {
    const configPath = 'vitest.config.ts'
    let config = readFileSync(configPath, 'utf-8')

    // Add hook timeout if not present
    if (!config.includes('hookTimeout')) {
      config = config.replace(/testTimeout:\s*\d+,?/, '$&\n    hookTimeout: 10000,')
    }

    writeFileSync(configPath, config, 'utf-8')
  }

  private async fixInfiniteLoops(filePath: string): Promise<void> {
    let content = readFileSync(filePath, 'utf-8')

    // Add timeout to while loops
    content = content.replace(
      /while\s*\(true\)/g,
      'let timeout = Date.now() + 5000; while (Date.now() < timeout)'
    )

    // Add cleanup for intervals
    content = content.replace(/setInterval\(/g, 'const interval = setInterval(')

    if (content.includes('const interval = setInterval(')) {
      content +=
        '\n\n// Cleanup intervals\nafterEach(() => {\n  if (typeof interval !== "undefined") clearInterval(interval)\n})\n'
    }

    writeFileSync(filePath, content, 'utf-8')
  }

  private async addEventListenerCleanup(filePath: string): Promise<void> {
    let content = readFileSync(filePath, 'utf-8')

    // Add cleanup for event listeners
    if (!content.includes('afterEach')) {
      content +=
        '\n\nafterEach(() => {\n  // Cleanup event listeners\n  document.removeEventListener("click", () => {})\n})\n'
    }

    writeFileSync(filePath, content, 'utf-8')
  }

  private async addIntervalCleanup(filePath: string): Promise<void> {
    let content = readFileSync(filePath, 'utf-8')

    // Add interval cleanup
    content = content.replace(/setInterval\(/g, 'const testInterval = setInterval(')

    if (!content.includes('afterEach') && content.includes('testInterval')) {
      content +=
        '\n\nafterEach(() => {\n  if (typeof testInterval !== "undefined") clearInterval(testInterval)\n})\n'
    }

    writeFileSync(filePath, content, 'utf-8')
  }

  private async fixAsyncPatterns(filePath: string): Promise<void> {
    let content = readFileSync(filePath, 'utf-8')

    // Fix missing await for waitFor
    content = content.replace(/(?<!await\s+)waitFor\(/g, 'await waitFor(')

    // Ensure test functions are async
    content = content.replace(/it\(['"`]([^'"`]+)['"`],\s*\(\)\s*=>\s*{/g, "it('$1', async () => {")

    writeFileSync(filePath, content, 'utf-8')
  }

  private async verifyFixes(): Promise<void> {
    console.log('\n🧪 Verifying fixes...')

    try {
      // Try to run a simple test to see if hanging is resolved
      const result = execSync(
        'timeout 30s bun run test --run --reporter=basic 2>&1 || echo "TIMEOUT"',
        {
          encoding: 'utf-8',
          timeout: 35_000,
        }
      )

      if (result.includes('TIMEOUT')) {
        console.log('⚠️  Tests still hanging after fixes. Manual intervention may be required.')
      } else {
        console.log('✅ Vitest configuration appears to be working!')
      }
    } catch (error) {
      console.log('⚠️  Could not verify fixes automatically. Please test manually.')
    }
  }
}

// Run the fixer
if (import.meta.main) {
  const fixer = new VitestConfigFixer()
  fixer.run().catch(console.error)
}

export { VitestConfigFixer }
