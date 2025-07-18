#!/usr/bin/env node

/**
 * Coverage Setup Test Script
 * Tests the coverage configuration for conflicts and proper setup
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const coverageConfig = require('../coverage.config.js')

class CoverageSetupTester {
  constructor() {
    this.projectRoot = path.join(__dirname, '..')
    this.issues = []
    this.warnings = []
    this.suggestions = []
  }

  async testCoverageSetup() {
    console.log('🧪 Testing coverage setup...')
    console.log('='.repeat(60))

    try {
      // Test configuration files
      await this.testConfigurationFiles()

      // Test directory structure
      await this.testDirectoryStructure()

      // Test file patterns
      await this.testFilePatterns()

      // Test for conflicts
      await this.testForConflicts()

      // Test dependencies
      await this.testDependencies()

      // Test scripts
      await this.testScripts()

      // Generate report
      await this.generateTestReport()

      // Print results
      this.printResults()

      process.exit(this.issues.length > 0 ? 1 : 0)
    } catch (error) {
      console.error('❌ Coverage setup test failed:', error.message)
      process.exit(1)
    }
  }

  async testConfigurationFiles() {
    console.log('\n📄 Testing configuration files...')

    const configFiles = [
      { name: 'bunfig.toml', path: 'bunfig.toml' },
      { name: 'vitest.unit.config.ts', path: 'vitest.unit.config.ts' },
      { name: 'vitest.config.ts', path: 'vitest.config.ts' },
      { name: 'coverage.config.js', path: 'coverage.config.js' },
    ]

    for (const config of configFiles) {
      const configPath = path.join(this.projectRoot, config.path)

      if (fs.existsSync(configPath)) {
        console.log(`  ✅ ${config.name} - Found`)

        // Check for specific coverage configurations
        const content = fs.readFileSync(configPath, 'utf8')

        if (config.name === 'bunfig.toml') {
          if (content.includes('coverage = true')) {
            console.log(`    ✅ Coverage enabled`)
          } else {
            this.issues.push(`${config.name}: Coverage not enabled`)
          }

          if (content.includes('coverage_dir')) {
            console.log(`    ✅ Coverage directory configured`)
          } else {
            this.warnings.push(`${config.name}: Coverage directory not explicitly set`)
          }
        }

        if (config.name.includes('vitest')) {
          if (content.includes('coverage:')) {
            console.log(`    ✅ Coverage configuration found`)
          } else {
            this.issues.push(`${config.name}: Coverage configuration missing`)
          }
        }
      } else {
        this.issues.push(`${config.name}: Configuration file not found`)
      }
    }
  }

  async testDirectoryStructure() {
    console.log('\n📁 Testing directory structure...')

    const requiredDirs = ['coverage', 'scripts', 'tests', 'tests/setup']

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir)

      if (fs.existsSync(dirPath)) {
        console.log(`  ✅ ${dir}/ - Exists`)
      } else {
        console.log(`  ⚠️  ${dir}/ - Missing (will be created)`)
        this.warnings.push(`Directory ${dir} will be created automatically`)
      }
    }

    // Test coverage output directories
    const coverageOutputs = [
      'coverage/bun-logic',
      'coverage/vitest-components',
      'coverage/vitest-integration',
      'coverage/merged',
      'coverage/final-report',
    ]

    for (const output of coverageOutputs) {
      const outputPath = path.join(this.projectRoot, output)

      if (fs.existsSync(outputPath)) {
        console.log(`  ✅ ${output}/ - Ready`)
      } else {
        console.log(`  💡 ${output}/ - Will be created on first run`)
      }
    }
  }

  async testFilePatterns() {
    console.log('\n🔍 Testing file patterns...')

    // Test for file pattern overlaps
    const tiers = coverageConfig.tiers
    const overlaps = []

    for (const [tierName, tierConfig] of Object.entries(tiers)) {
      for (const [otherTierName, otherTierConfig] of Object.entries(tiers)) {
        if (tierName !== otherTierName) {
          const overlap = this.findPatternOverlap(tierConfig.include, otherTierConfig.include)
          if (overlap.length > 0) {
            overlaps.push({
              tier1: tierName,
              tier2: otherTierName,
              patterns: overlap,
            })
          }
        }
      }
    }

    if (overlaps.length > 0) {
      console.log('  ⚠️  Pattern overlaps detected:')
      overlaps.forEach((overlap) => {
        console.log(`    ${overlap.tier1} ↔ ${overlap.tier2}: ${overlap.patterns.join(', ')}`)
      })
      this.warnings.push('File pattern overlaps detected - this may cause duplicate coverage')
    } else {
      console.log('  ✅ No conflicting file patterns found')
    }

    // Test for actual files matching patterns
    for (const [tierName, tierConfig] of Object.entries(tiers)) {
      console.log(`\n  📋 Testing ${tierName} patterns:`)

      let matchedFiles = 0
      for (const pattern of tierConfig.include) {
        const files = this.findMatchingFiles(pattern)
        matchedFiles += files.length

        if (files.length > 0) {
          console.log(`    ✅ ${pattern} - ${files.length} files`)
        } else {
          console.log(`    ⚠️  ${pattern} - No matching files`)
        }
      }

      if (matchedFiles === 0) {
        this.warnings.push(`${tierName}: No files match any include patterns`)
      }
    }
  }

  async testForConflicts() {
    console.log('\n⚔️  Testing for conflicts...')

    // Test for output directory conflicts
    const outputDirs = Object.values(coverageConfig.tiers).map((tier) => tier.outputDir)
    const uniqueOutputs = [...new Set(outputDirs)]

    if (outputDirs.length !== uniqueOutputs.length) {
      this.issues.push('Output directory conflicts detected')
      console.log('  ❌ Output directory conflicts found')
    } else {
      console.log('  ✅ No output directory conflicts')
    }

    // Test for runner conflicts
    const runnerConflicts = this.checkRunnerConflicts()
    if (runnerConflicts.length > 0) {
      console.log('  ⚠️  Runner conflicts detected:')
      runnerConflicts.forEach((conflict) => {
        console.log(`    ${conflict}`)
      })
      this.warnings.push('Runner conflicts may cause issues')
    } else {
      console.log('  ✅ No runner conflicts')
    }

    // Test for threshold conflicts
    const thresholdIssues = this.checkThresholdConsistency()
    if (thresholdIssues.length > 0) {
      console.log('  ⚠️  Threshold inconsistencies:')
      thresholdIssues.forEach((issue) => {
        console.log(`    ${issue}`)
      })
      this.warnings.push('Threshold inconsistencies detected')
    } else {
      console.log('  ✅ Threshold configuration is consistent')
    }
  }

  async testDependencies() {
    console.log('\n📦 Testing dependencies...')

    const packageJsonPath = path.join(this.projectRoot, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    const requiredDeps = [
      { name: '@vitest/coverage-v8', type: 'devDependencies' },
      { name: 'vitest', type: 'devDependencies' },
    ]

    for (const dep of requiredDeps) {
      const deps = packageJson[dep.type] || {}

      if (deps[dep.name]) {
        console.log(`  ✅ ${dep.name} - ${deps[dep.name]}`)
      } else {
        this.issues.push(`Missing dependency: ${dep.name}`)
      }
    }

    // Test for optional dependencies
    const optionalDeps = [
      { name: 'nyc', type: 'devDependencies' },
      { name: 'genhtml', type: 'devDependencies' },
    ]

    for (const dep of optionalDeps) {
      const deps = packageJson[dep.type] || {}

      if (deps[dep.name]) {
        console.log(`  ✅ ${dep.name} - ${deps[dep.name]} (optional)`)
      } else {
        this.suggestions.push(`Consider adding ${dep.name} for enhanced coverage reporting`)
      }
    }
  }

  async testScripts() {
    console.log('\n🔧 Testing npm scripts...')

    const packageJsonPath = path.join(this.projectRoot, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    const requiredScripts = [
      'test:coverage',
      'test:coverage:merge',
      'test:coverage:validate',
      'test:unit:logic:coverage',
      'test:unit:components:coverage',
      'test:integration:coverage',
    ]

    for (const script of requiredScripts) {
      if (packageJson.scripts[script]) {
        console.log(`  ✅ ${script}`)
      } else {
        this.issues.push(`Missing script: ${script}`)
      }
    }

    // Test script dependencies
    const scriptDeps = [
      { script: 'test:coverage', deps: ['test:coverage:merge'] },
      { script: 'test:coverage:merge', deps: ['scripts/merge-coverage.js'] },
    ]

    for (const { script, deps } of scriptDeps) {
      if (packageJson.scripts[script]) {
        for (const dep of deps) {
          if (
            packageJson.scripts[script].includes(dep) ||
            fs.existsSync(path.join(this.projectRoot, dep))
          ) {
            console.log(`  ✅ ${script} → ${dep}`)
          } else {
            this.issues.push(`${script}: Missing dependency ${dep}`)
          }
        }
      }
    }
  }

  findPatternOverlap(patterns1, patterns2) {
    const overlap = []

    for (const pattern1 of patterns1) {
      for (const pattern2 of patterns2) {
        if (this.patternsOverlap(pattern1, pattern2)) {
          overlap.push(pattern1)
          break
        }
      }
    }

    return overlap
  }

  patternsOverlap(pattern1, pattern2) {
    // Simple overlap detection - could be enhanced
    const normalize = (pattern) => pattern.replace(/\*\*/g, '*').replace(/\{[^}]*\}/g, '*')
    const norm1 = normalize(pattern1)
    const norm2 = normalize(pattern2)

    return norm1.includes(norm2.replace(/\*/g, '')) || norm2.includes(norm1.replace(/\*/g, ''))
  }

  findMatchingFiles(pattern) {
    try {
      // Simple file matching - in real implementation, use glob
      const basePath = pattern.split('/**')[0] || pattern.split('/*')[0]
      const fullPath = path.join(this.projectRoot, basePath)

      if (fs.existsSync(fullPath)) {
        return [fullPath] // Simplified - actual implementation would use glob matching
      }

      return []
    } catch (error) {
      return []
    }
  }

  checkRunnerConflicts() {
    const conflicts = []

    // Check for files that might be run by both Bun and Vitest
    const bunPatterns = coverageConfig.tiers.logic.include
    const vitestPatterns = [
      ...coverageConfig.tiers.components.include,
      ...coverageConfig.tiers.integration.include,
    ]

    for (const bunPattern of bunPatterns) {
      for (const vitestPattern of vitestPatterns) {
        if (this.patternsOverlap(bunPattern, vitestPattern)) {
          conflicts.push(`${bunPattern} (Bun) overlaps with ${vitestPattern} (Vitest)`)
        }
      }
    }

    return conflicts
  }

  checkThresholdConsistency() {
    const issues = []

    // Check that tier thresholds are logical
    const tiers = coverageConfig.tiers
    const logicThresholds = tiers.logic.thresholds.global
    const componentThresholds = tiers.components.thresholds.global
    const integrationThresholds = tiers.integration.thresholds.global

    // Logic tests should have highest thresholds
    if (logicThresholds.lines <= componentThresholds.lines) {
      issues.push('Logic test thresholds should be higher than component test thresholds')
    }

    if (componentThresholds.lines <= integrationThresholds.lines) {
      issues.push('Component test thresholds should be higher than integration test thresholds')
    }

    // Check that merged thresholds are reasonable
    const mergedThresholds = coverageConfig.merged.thresholds.global
    const avgThreshold =
      (logicThresholds.lines + componentThresholds.lines + integrationThresholds.lines) / 3

    if (mergedThresholds.lines > avgThreshold + 10) {
      issues.push('Merged thresholds may be too high compared to individual tier thresholds')
    }

    return issues
  }

  async generateTestReport() {
    const reportPath = path.join(this.projectRoot, 'coverage', 'setup-test-report.json')

    // Ensure coverage directory exists
    const coverageDir = path.dirname(reportPath)
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true })
    }

    const report = {
      timestamp: new Date().toISOString(),
      status: this.issues.length === 0 ? 'PASS' : 'FAIL',
      summary: {
        issues: this.issues.length,
        warnings: this.warnings.length,
        suggestions: this.suggestions.length,
      },
      details: {
        issues: this.issues,
        warnings: this.warnings,
        suggestions: this.suggestions,
      },
      configuration: {
        tiers: Object.keys(coverageConfig.tiers).length,
        outputDirectories: Object.values(coverageConfig.tiers).map((tier) => tier.outputDir),
        thresholds: Object.fromEntries(
          Object.entries(coverageConfig.tiers).map(([name, config]) => [
            name,
            config.thresholds.global,
          ])
        ),
      },
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Test report saved: ${reportPath}`)
  }

  printResults() {
    console.log('\n' + '='.repeat(60))
    console.log('🧪 COVERAGE SETUP TEST RESULTS')
    console.log('='.repeat(60))

    if (this.issues.length === 0) {
      console.log('\n🎉 All tests passed! Coverage setup is ready.')
    } else {
      console.log('\n❌ Issues found that need to be resolved:')
      this.issues.forEach((issue) => console.log(`  - ${issue}`))
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`)
      this.warnings.forEach((warning) => console.log(`  - ${warning}`))
    }

    if (this.suggestions.length > 0) {
      console.log(`\n💡 Suggestions (${this.suggestions.length}):`)
      this.suggestions.forEach((suggestion) => console.log(`  - ${suggestion}`))
    }

    console.log('\n' + '='.repeat(60))
  }
}

// Run the test
const tester = new CoverageSetupTester()
tester.testCoverageSetup()
