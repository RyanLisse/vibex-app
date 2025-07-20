#!/usr/bin/env bun

import { promises as fs } from 'fs'
import { join } from 'path'

interface CoverageConfig {
  enabled: boolean
  provider: 'v8' | 'istanbul' | 'c8'
  reporter: string[]
  include: string[]
  exclude: string[]
  thresholds: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
  reportOnFailure: boolean
  clean: boolean
  reportsDirectory: string
  skipFull: boolean
}

const defaultCoverageConfig: CoverageConfig = {
  enabled: true,
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  include: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
  ],
  exclude: [
    'node_modules',
    'dist',
    '.next',
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.d.ts',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/test/**',
    '**/tests/**',
    '**/*.stories.*',
    '**/*.config.*',
    '**/scripts/**',
    '**/migrations/**',
    '**/generated/**',
    '**/__generated__/**',
  ],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
  reportOnFailure: true,
  clean: true,
  reportsDirectory: './coverage',
  skipFull: false,
}

async function updateVitestConfig(configPath: string, coverageConfig: CoverageConfig) {
  try {
    const content = await fs.readFile(configPath, 'utf-8')

    // Check if coverage is already configured
    if (content.includes('coverage:')) {
      console.log(`Coverage already configured in ${configPath}`)
      return
    }

    // Find the test configuration object
    const testConfigMatch = content.match(/test:\s*{([^}]+)}/s)
    if (!testConfigMatch) {
      console.error(`Could not find test configuration in ${configPath}`)
      return
    }

    // Insert coverage configuration
    const coverageConfigStr = `
    coverage: ${JSON.stringify(coverageConfig, null, 6).replace(/^/gm, '    ').trim()},`

    const updatedContent = content.replace(/test:\s*{/, `test: {${coverageConfigStr}`)

    await fs.writeFile(configPath, updatedContent)
    console.log(`Updated ${configPath} with coverage configuration`)
  } catch (error) {
    console.error(`Error updating ${configPath}:`, error)
  }
}

async function createCoverageScript() {
  const scriptContent = `#!/usr/bin/env bash

# Coverage report generation script

echo "Running test coverage analysis..."

# Clean previous coverage
rm -rf coverage

# Run tests with coverage for each configuration
echo "Running unit test coverage..."
bunx vitest run --coverage --config vitest.config.ts

echo "Running component test coverage..."
bunx vitest run --coverage --config vitest.components.config.ts

echo "Running integration test coverage..."
bunx vitest run --coverage --config vitest.integration.config.ts

# Merge coverage reports
echo "Merging coverage reports..."
bunx nyc merge coverage coverage/merged

# Generate final report
echo "Generating final coverage report..."
bunx nyc report --reporter=html --reporter=text --reporter=lcov --report-dir=coverage/final

echo "Coverage report generated at coverage/final/index.html"
`

  const scriptPath = join(process.cwd(), 'scripts/generate-coverage.sh')
  await fs.writeFile(scriptPath, scriptContent)
  await fs.chmod(scriptPath, '755')
  console.log('Created coverage generation script at scripts/generate-coverage.sh')
}

async function createCoverageAnalyzer() {
  const analyzerContent = `#!/usr/bin/env bun

import { promises as fs } from 'fs';
import { join } from 'path';

interface CoverageData {
  path: string;
  lines: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
}

async function analyzeCoverage() {
  try {
    const coveragePath = join(process.cwd(), 'coverage/coverage-final.json');
    const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf-8'));
    
    const files: CoverageData[] = [];
    
    for (const [path, data] of Object.entries(coverageData)) {
      if (typeof data !== 'object' || !data) continue;
      
      const fileCoverage = data as any;
      
      files.push({
        path: path.replace(process.cwd() + '/', ''),
        lines: fileCoverage.lines || { total: 0, covered: 0, pct: 0 },
        functions: fileCoverage.functions || { total: 0, covered: 0, pct: 0 },
        branches: fileCoverage.branches || { total: 0, covered: 0, pct: 0 },
        statements: fileCoverage.statements || { total: 0, covered: 0, pct: 0 },
      });
    }
    
    // Sort by lowest coverage
    files.sort((a, b) => a.lines.pct - b.lines.pct);
    
    console.log('\\n=== FILES WITH LOWEST COVERAGE ===\\n');
    files.slice(0, 20).forEach(file => {
      console.log(\`\${file.path}:\`);
      console.log(\`  Lines: \${file.lines.pct}% (\${file.lines.covered}/\${file.lines.total})\`);
      console.log(\`  Functions: \${file.functions.pct}% (\${file.functions.covered}/\${file.functions.total})\`);
      console.log(\`  Branches: \${file.branches.pct}% (\${file.branches.covered}/\${file.branches.total})\`);
      console.log(\`  Statements: \${file.statements.pct}% (\${file.statements.covered}/\${file.statements.total})\`);
      console.log();
    });
    
    // Calculate totals
    const totals = files.reduce((acc, file) => ({
      lines: {
        total: acc.lines.total + file.lines.total,
        covered: acc.lines.covered + file.lines.covered,
      },
      functions: {
        total: acc.functions.total + file.functions.total,
        covered: acc.functions.covered + file.functions.covered,
      },
      branches: {
        total: acc.branches.total + file.branches.total,
        covered: acc.branches.covered + file.branches.covered,
      },
      statements: {
        total: acc.statements.total + file.statements.total,
        covered: acc.statements.covered + file.statements.covered,
      },
    }), {
      lines: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
    });
    
    console.log('\\n=== OVERALL COVERAGE ===\\n');
    console.log(\`Lines: \${((totals.lines.covered / totals.lines.total) * 100).toFixed(2)}% (\${totals.lines.covered}/\${totals.lines.total})\`);
    console.log(\`Functions: \${((totals.functions.covered / totals.functions.total) * 100).toFixed(2)}% (\${totals.functions.covered}/\${totals.functions.total})\`);
    console.log(\`Branches: \${((totals.branches.covered / totals.branches.total) * 100).toFixed(2)}% (\${totals.branches.covered}/\${totals.branches.total})\`);
    console.log(\`Statements: \${((totals.statements.covered / totals.statements.total) * 100).toFixed(2)}% (\${totals.statements.covered}/\${totals.statements.total})\`);
    
  } catch (error) {
    console.error('Error analyzing coverage:', error);
    console.log('Make sure to run tests with coverage first: bunx vitest run --coverage');
  }
}

analyzeCoverage();
`

  const analyzerPath = join(process.cwd(), 'scripts/analyze-coverage.ts')
  await fs.writeFile(analyzerPath, analyzerContent)
  console.log('Created coverage analyzer at scripts/analyze-coverage.ts')
}

async function main() {
  console.log('Setting up coverage configuration...\n')

  // Update vitest configs
  const configs = [
    'vitest.config.ts',
    'vitest.components.config.ts',
    'vitest.integration.config.ts',
    'vitest.browser.config.ts',
  ]

  for (const config of configs) {
    const configPath = join(process.cwd(), config)
    try {
      await fs.access(configPath)
      await updateVitestConfig(configPath, defaultCoverageConfig)
    } catch {
      console.log(`Skipping ${config} (not found)`)
    }
  }

  // Create helper scripts
  await createCoverageScript()
  await createCoverageAnalyzer()

  console.log('\nCoverage setup complete!')
  console.log('Run ./scripts/generate-coverage.sh to generate coverage reports')
}

main().catch(console.error)
