# Coverage Architecture

## Overview

This project implements a unified coverage reporting system that handles multiple test types with different runners, separate output directories, and intelligent merging to provide comprehensive coverage insights.

## Architecture

### Test Tiers

The coverage system is organized into three main tiers:

#### 1. Logic Tests (Bun)
- **Runner**: Bun's built-in test runner
- **Target**: Utility functions, schemas, stores, and pure logic
- **Output**: `./coverage/bun-logic/`
- **Thresholds**: 85% (lines/functions/branches/statements)
- **Configuration**: `bunfig.toml`

**Covered Files:**
- `lib/**/*.{js,ts}`
- `src/lib/**/*.{js,ts}`
- `src/schemas/**/*.{js,ts}`
- `stores/**/*.{js,ts}`
- `src/hooks/useZodForm/**/*.{js,ts}`
- `src/shared/**/*.{js,ts}`
- `src/types/**/*.{js,ts}`

#### 2. Component Tests (Vitest)
- **Runner**: Vitest with React Testing Library
- **Target**: React components and hooks
- **Output**: `./coverage/vitest-components/`
- **Thresholds**: 75% (lines/functions/branches/statements)
- **Configuration**: `vitest.unit.config.ts`

**Covered Files:**
- `components/**/*.{jsx,tsx}`
- `app/**/*.{jsx,tsx}`
- `hooks/**/*.{jsx,tsx}`
- `src/components/**/*.{jsx,tsx}`
- `src/hooks/**/*.{jsx,tsx}`

#### 3. Integration Tests (Vitest)
- **Runner**: Vitest with Node.js environment
- **Target**: API routes, actions, and integration workflows
- **Output**: `./coverage/vitest-integration/`
- **Thresholds**: 70% (lines/functions/branches/statements)
- **Configuration**: `vitest.config.ts`

**Covered Files:**
- `app/api/**/*.{js,ts}`
- `app/actions/**/*.{js,ts}`
- `lib/**/*.{js,ts}`
- `src/lib/**/*.{js,ts}`
- `tests/integration/**/*.{js,ts}`

### Unified Coverage System

#### Coverage Merge Process

1. **Individual Reports**: Each test tier generates its own coverage report
2. **Collection**: The merge script collects all available reports
3. **Merging**: LCOV and JSON reports are combined using intelligent merging
4. **Deduplication**: Overlapping files are handled with conflict resolution
5. **Final Report**: A unified HTML report is generated with summary data

#### Quality Gates

The system implements three quality gate levels:

- **Minimum** (CI/CD): 70%/70%/65%/70% (L/F/B/S)
- **Target** (Production): 80%/80%/75%/80% (L/F/B/S)
- **Excellence** (High Quality): 90%/90%/85%/90% (L/F/B/S)

## Directory Structure

```
coverage/
├── bun-logic/           # Bun test coverage
│   ├── lcov.info
│   ├── coverage-final.json
│   └── index.html
├── vitest-components/   # Component test coverage
│   ├── lcov.info
│   ├── coverage-final.json
│   └── index.html
├── vitest-integration/  # Integration test coverage
│   ├── lcov.info
│   ├── coverage-final.json
│   └── index.html
├── merged/             # Temporary merged data
│   ├── lcov.info
│   └── coverage-final.json
├── final-report/       # Unified coverage report
│   ├── index.html
│   ├── summary.json
│   └── [coverage files]
└── setup-test-report.json
```

## Configuration Files

### `bunfig.toml`
```toml
[test]
coverage = true
coverage_dir = "./coverage/bun-logic"
coverage_threshold = 85
coverage_reporter = ["lcov", "text", "html", "json"]
```

### `vitest.unit.config.ts`
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov', 'json'],
  reportsDirectory: './coverage/vitest-components',
  thresholds: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
}
```

### `coverage.config.js`
Central configuration for all coverage settings, thresholds, and merge behavior.

## NPM Scripts

### Core Coverage Commands
```bash
# Run all tests with coverage and merge reports
npm run test:coverage

# Run individual test type coverage
npm run test:unit:logic:coverage      # Bun logic tests
npm run test:unit:components:coverage # Vitest component tests  
npm run test:integration:coverage     # Vitest integration tests

# Merge existing coverage reports
npm run test:coverage:merge

# Validate coverage against thresholds
npm run test:coverage:validate

# Open coverage reports
npm run test:coverage:report           # Final merged report
npm run test:unit:coverage:report      # Component coverage
npm run test:integration:coverage:report # Integration coverage
```

### Utility Commands
```bash
# Clean coverage directories
npm run test:coverage:clean

# View coverage configuration
npm run test:coverage:validate

# Test coverage setup
node scripts/test-coverage-setup.js
```

## Advanced Features

### Intelligent Merging
- **Conflict Resolution**: Handles overlapping files with configurable strategies
- **Fallback Methods**: Multiple merge strategies for different scenarios
- **Validation**: Ensures merged reports are accurate and complete

### Quality Analysis
- **Threshold Validation**: Automatic validation against configured thresholds
- **Quality Gates**: Multi-level quality assessment
- **Trend Analysis**: Historical coverage comparison (when available)

### Reporting
- **HTML Reports**: Interactive coverage reports for each tier
- **JSON Summary**: Machine-readable coverage data
- **LCOV Reports**: Standard format for CI/CD integration
- **Console Output**: Detailed coverage summaries

## Best Practices

### File Organization
- Keep test files close to source files
- Use consistent naming patterns
- Separate test types into appropriate directories

### Threshold Management
- Set higher thresholds for utility functions (85%+)
- Use moderate thresholds for components (75%+)
- Allow lower thresholds for integration tests (70%+)

### Workflow Integration
- Run coverage as part of CI/CD pipeline
- Fail builds on coverage threshold violations
- Generate coverage reports for pull requests

## Troubleshooting

### Common Issues

1. **Missing Coverage Reports**
   - Ensure test files exist and match patterns
   - Check that tests are passing
   - Verify configuration files are correct

2. **Merge Failures**
   - Check for nyc installation
   - Verify individual reports exist
   - Review file permissions

3. **Threshold Violations**
   - Review uncovered code
   - Add missing tests
   - Adjust thresholds if appropriate

### Debug Commands
```bash
# Test coverage setup
node scripts/test-coverage-setup.js

# Validate individual reports
node scripts/validate-coverage.js

# View configuration
node coverage.config.js
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Validate coverage
  run: npm run test:coverage:validate

- name: Upload coverage reports
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/final-report/lcov.info
```

## Monitoring and Maintenance

### Regular Tasks
- Review coverage trends
- Update thresholds as codebase matures
- Ensure all new code has appropriate test coverage
- Monitor for configuration drift

### Performance Optimization
- Exclude unnecessary files from coverage
- Use appropriate reporters for different environments
- Consider parallel test execution for large codebases

## Future Enhancements

### Planned Features
- Coverage trend analysis
- Automated threshold adjustment
- Integration with more test runners
- Advanced conflict resolution strategies
- Real-time coverage monitoring

### Extension Points
- Custom reporters
- Additional merge strategies
- Integration with external tools
- Advanced analytics and insights

---

This unified coverage system provides comprehensive test coverage analysis while maintaining separation of concerns and avoiding conflicts between different test types and runners.