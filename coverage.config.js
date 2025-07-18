#!/usr/bin/env node

/**
 * Coverage Configuration for Multi-Tier Testing
 * Defines thresholds and settings for different test types
 */

const coverageConfig = {
  // Test tier configurations
  tiers: {
    // Logic tests (Bun) - Highest thresholds for utilities/pure functions
    logic: {
      name: 'Bun Logic Tests',
      runner: 'bun',
      outputDir: './coverage/bun-logic',
      thresholds: {
        global: {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
      },
      include: [
        'lib/**/*.{js,ts}',
        'src/lib/**/*.{js,ts}',
        'src/schemas/**/*.{js,ts}',
        'stores/**/*.{js,ts}',
        'src/hooks/useZodForm/**/*.{js,ts}',
        'src/shared/**/*.{js,ts}',
        'src/types/**/*.{js,ts}',
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.stories.{js,ts,jsx,tsx}',
        '**/types.ts',
        'components/**',
        'app/**/*.{jsx,tsx}',
        'src/components/**',
      ],
    },

    // Component tests (Vitest) - Moderate thresholds for React components
    components: {
      name: 'Vitest Component Tests',
      runner: 'vitest',
      outputDir: './coverage/vitest-components',
      thresholds: {
        global: {
          lines: 75,
          functions: 75,
          branches: 75,
          statements: 75,
        },
      },
      include: [
        'components/**/*.{jsx,tsx}',
        'app/**/*.{jsx,tsx}',
        'hooks/**/*.{jsx,tsx}',
        'src/components/**/*.{jsx,tsx}',
        'src/hooks/**/*.{jsx,tsx}',
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types.ts',
        '**/.storybook/**',
        '**/storybook-static/**',
        'lib/**/*.{js,ts}',
        'src/lib/**/*.{js,ts}',
        'stores/**/*.{js,ts}',
        'src/schemas/**/*.{js,ts}',
        'src/hooks/useZodForm/**/*.{js,ts}',
      ],
    },

    // Integration tests (Vitest) - Lower thresholds for complex workflows
    integration: {
      name: 'Vitest Integration Tests',
      runner: 'vitest',
      outputDir: './coverage/vitest-integration',
      thresholds: {
        global: {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
      include: [
        'app/api/**/*.{js,ts}',
        'app/actions/**/*.{js,ts}',
        'lib/**/*.{js,ts}',
        'src/lib/**/*.{js,ts}',
        'tests/integration/**/*.{js,ts}',
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/unit/**',
        'tests/e2e/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types.ts',
        '**/.storybook/**',
        '**/storybook-static/**',
        'lib/**/*.{js,ts}',
        'src/lib/**/*.{js,ts}',
        'stores/**/*.{js,ts}',
        'src/schemas/**/*.{js,ts}',
        'src/hooks/useZodForm/**/*.{js,ts}',
      ],
    },
  },

  // Merged coverage configuration
  merged: {
    name: 'Unified Coverage Report',
    outputDir: './coverage/final-report',
    thresholds: {
      global: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    reporters: ['html', 'lcov', 'json', 'text'],
    summaryFile: './coverage/final-report/summary.json',
  },

  // Quality gates
  qualityGates: {
    // Minimum coverage required for CI/CD to pass
    minimum: {
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70,
    },
    // Target coverage for production readiness
    target: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    // Excellence thresholds for high-quality code
    excellence: {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
    },
  },

  // File pattern overrides for specific coverage requirements
  filePatterns: {
    // Critical files require higher coverage
    critical: {
      patterns: [
        'lib/auth/**/*.{js,ts}',
        'lib/security/**/*.{js,ts}',
        'src/lib/auth/**/*.{js,ts}',
        'app/api/auth/**/*.{js,ts}',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },

    // UI components can have slightly lower coverage
    ui: {
      patterns: ['components/ui/**/*.{jsx,tsx}', 'src/components/ui/**/*.{jsx,tsx}'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },

    // Utility functions should have high coverage
    utilities: {
      patterns: [
        'lib/utils/**/*.{js,ts}',
        'src/lib/utils/**/*.{js,ts}',
        'src/shared/utils/**/*.{js,ts}',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },

  // Coverage exclusions
  globalExclusions: [
    'node_modules/**',
    'dist/**',
    '.next/**',
    'coverage/**',
    'tests/**',
    '**/*.d.ts',
    '**/*.config.{js,ts}',
    '**/*.stories.{js,ts,jsx,tsx}',
    '**/types.ts',
    '**/.storybook/**',
    '**/storybook-static/**',
    'scripts/**',
    'docs/**',
    'public/**',
    'playwright-report/**',
    'test-results/**',
    'memory/**',
    'claude-flow*',
    '*.md',
    '*.json',
    '*.yml',
    '*.yaml',
    'lefthook.yml',
    'commitlint.config.js',
    'postcss.config.*',
    'tailwind.config.*',
    'next.config.*',
    'instrumentation.ts',
    'middleware.ts',
  ],

  // Coverage merge settings
  merge: {
    // Merge strategy for overlapping files
    strategy: 'union', // 'union' | 'intersection' | 'first-wins'

    // Handle conflicts in coverage data
    conflictResolution: 'highest', // 'highest' | 'lowest' | 'average'

    // Generate comparison reports
    generateComparison: true,

    // Include individual reports in merged output
    includeIndividualReports: true,
  },

  // Reporting configuration
  reporting: {
    // Console output settings
    console: {
      verbose: true,
      showIndividualFiles: false,
      colorize: true,
      threshold: 'minimum',
    },

    // HTML report settings
    html: {
      title: 'CodeX Clone Coverage Report',
      outputDir: './coverage/final-report',
      includeSourceMaps: true,
      showBranchCoverage: true,
    },

    // LCOV report settings
    lcov: {
      outputFile: './coverage/final-report/lcov.info',
      projectRoot: process.cwd(),
    },

    // JSON report settings
    json: {
      outputFile: './coverage/final-report/coverage-final.json',
      includeRawData: true,
    },
  },
}

// Export configuration
module.exports = coverageConfig

// If run directly, output configuration
if (require.main === module) {
  console.log('Coverage Configuration:')
  console.log('='.repeat(60))
  console.log()

  console.log('📊 Test Tiers:')
  Object.entries(coverageConfig.tiers).forEach(([key, config]) => {
    console.log(`  ${key}: ${config.name}`)
    console.log(`    Runner: ${config.runner}`)
    console.log(`    Output: ${config.outputDir}`)
    console.log(
      `    Thresholds: ${config.thresholds.global.lines}%/${config.thresholds.global.functions}%/${config.thresholds.global.branches}%/${config.thresholds.global.statements}%`
    )
    console.log()
  })

  console.log('🎯 Quality Gates:')
  Object.entries(coverageConfig.qualityGates).forEach(([level, thresholds]) => {
    console.log(
      `  ${level}: ${thresholds.lines}%/${thresholds.functions}%/${thresholds.branches}%/${thresholds.statements}%`
    )
  })
  console.log()

  console.log('📁 Merged Report: ' + coverageConfig.merged.outputDir)
  console.log('📄 Summary File: ' + coverageConfig.merged.summaryFile)
}
