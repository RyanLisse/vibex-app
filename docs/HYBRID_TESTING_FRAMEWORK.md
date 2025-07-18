# 🧪 Hybrid Testing Framework

A comprehensive testing strategy combining Bun and Vitest for optimal performance and coverage.

## 🏗️ Architecture Overview

### Test Runner Distribution

| Test Type | Runner | Environment | Target |
|-----------|---------|-------------|---------|
| **Logic & Utilities** | 🦘 Bun | happy-dom | Pure functions, schemas, stores |
| **React Components** | ⚛️ Vitest | jsdom | Components, hooks, UI logic |
| **Integration** | 🔗 Vitest | node | API routes, actions, workflows |
| **E2E** | 🎭 Playwright | browser | Full user journeys |

### Why Hybrid?

- **🚀 Speed**: Bun's native performance for utility tests
- **🎯 Precision**: Vitest's React ecosystem integration
- **🔍 Coverage**: Comprehensive test separation
- **🛡️ Reliability**: Optimal tool for each test type

## 📦 Configuration Files

### Bun Configuration (`bunfig.toml`)
```toml
[test]
coverage = true
environment = "happy-dom"
include = [
  "lib/**/*.test.{js,ts}",
  "src/lib/**/*.test.{js,ts}",
  "stores/**/*.test.{js,ts}",
  "src/schemas/**/*.test.{js,ts}"
]
exclude = [
  "**/*.test.{jsx,tsx}",
  "components/**/*.test.*",
  "tests/integration/**"
]
```

### Vitest Component Config (`vitest.unit.config.ts`)
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'components/**/*.test.{jsx,tsx}',
      'app/**/*.test.{jsx,tsx}',
      'hooks/**/*.test.{jsx,tsx}'
    ],
    exclude: [
      'lib/**/*.test.{js,ts}',
      'stores/**/*.test.{js,ts}'
    ]
  }
})
```

## 🎯 Test Execution

### Quick Commands

```bash
# Run all unit tests (logic + components)
bun run test:unit

# Run specific test types
bun run test:unit:logic        # Bun utility tests
bun run test:unit:components   # Vitest component tests
bun run test:integration       # Vitest integration tests
bun run test:e2e              # Playwright E2E tests

# Watch mode
bun run test:watch            # Watch all unit tests
bun run test:unit:logic:watch # Watch Bun tests only
bun run test:unit:components:watch # Watch component tests only

# Coverage
bun run test:coverage         # Generate unified coverage
bun run test:coverage:report  # Open coverage report
```

### Full Test Suite
```bash
# Run everything
bun run test:all

# Quality pipeline
bun run quality
```

## 📊 Coverage Reporting

### Unified Coverage System

The framework generates separate coverage reports for each test type, then merges them into a unified report:

```
coverage/
├── bun-logic/           # Bun test coverage
├── vitest-components/   # Component test coverage  
├── vitest-integration/  # Integration test coverage
└── final-report/        # Merged coverage report
```

### Coverage Thresholds

| Test Type | Lines | Functions | Statements | Branches |
|-----------|-------|-----------|------------|----------|
| Logic Tests | 85% | 85% | 85% | 80% |
| Component Tests | 80% | 80% | 80% | 75% |
| Integration Tests | 70% | 70% | 70% | 65% |
| **Overall** | **80%** | **80%** | **80%** | **75%** |

### Coverage Validation

```bash
# Validate all coverage thresholds
bun run test:coverage:validate

# Clean coverage data
bun run test:coverage:clean
```

## 🧪 Test Patterns

### Bun Logic Tests
```typescript
// lib/utils.test.ts
import { describe, expect, it } from 'bun:test'
import { parseRepositoryName } from './utils'

describe('parseRepositoryName', () => {
  it('should parse valid repository name', () => {
    const result = parseRepositoryName('owner/repo')
    expect(result).toEqual({ owner: 'owner', repo: 'repo' })
  })
})
```

### Vitest Component Tests
```typescript
// components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Vitest Integration Tests
```typescript
// tests/integration/api.test.ts
import { describe, expect, it } from 'vitest'
import { POST } from '@/app/api/tasks/route'

describe('Tasks API', () => {
  it('should create task', async () => {
    const response = await POST(new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' })
    }))
    expect(response.status).toBe(201)
  })
})
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Path Alias Resolution
**Problem**: Import errors with `@/` aliases
**Solution**: Check `tsconfig.json` and test config aliases match

#### 2. Test File Classification
**Problem**: Wrong test runner executing files
**Solution**: Review include/exclude patterns in configs

#### 3. Coverage Gaps
**Problem**: Missing coverage for certain files
**Solution**: Check coverage include/exclude patterns

#### 4. Mock Issues
**Problem**: Mocks not working correctly
**Solution**: Use appropriate mock API for each runner:
- Bun: `mock()`, `spyOn()`
- Vitest: `vi.mock()`, `vi.spyOn()`

### Debug Commands

```bash
# Check test file discovery
bun test --dry-run                    # See what Bun will test
vitest run --reporter=verbose --dry-run # See what Vitest will test

# Debug specific test
bun test --timeout=0 path/to/test.ts
vitest run --reporter=verbose path/to/test.ts
```

## 📈 Performance Optimization

### Parallel Execution
- Bun and Vitest can run simultaneously
- Use `concurrently` for watch mode
- Separate coverage outputs prevent conflicts

### Memory Management
- Isolated test environments
- Proper cleanup in `afterEach`
- Mock restoration between tests

### Speed Optimization
- Bun for fast utility tests
- Vitest only for React-specific tests
- Minimal test setup files

## 🔄 Maintenance

### Adding New Tests

1. **Utility/Logic Test**: Add to appropriate directory with `.test.ts`
2. **Component Test**: Add to component directory with `.test.tsx`
3. **Integration Test**: Add to `tests/integration/` with `.test.ts`
4. **E2E Test**: Add to `tests/e2e/` with `.spec.ts`

### Updating Configuration

1. **Bun**: Edit `bunfig.toml` for utility test patterns
2. **Vitest Components**: Edit `vitest.unit.config.ts` for component tests
3. **Vitest Integration**: Edit `vitest.integration.config.ts` for integration tests

### Coverage Adjustments

1. **Thresholds**: Edit `scripts/validate-coverage.js`
2. **Exclusions**: Update coverage exclude patterns in configs
3. **Merge Logic**: Modify `scripts/merge-coverage.js` if needed

## 🎯 Best Practices

1. **Test Separation**: Keep utility and component tests separate
2. **Mock Strategy**: Use runner-appropriate mocking APIs
3. **Coverage Goals**: Aim for high coverage with meaningful tests
4. **Performance**: Use Bun for fast execution, Vitest for React features
5. **CI/CD**: Run tests in parallel where possible
6. **Documentation**: Update this guide when adding new patterns

---

*🧪 This hybrid testing framework provides comprehensive coverage with optimal performance for modern React applications.*