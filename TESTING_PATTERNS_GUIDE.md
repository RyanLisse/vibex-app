# Testing Patterns Guide - CodeX Clone

## Overview

This guide documents the comprehensive testing patterns and best practices for the CodeX Clone project. Our testing strategy uses a multi-tier approach with Bun for logic tests and Vitest for component/integration tests.

## Testing Architecture

### 🏗️ Multi-Tier Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Tiers                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Logic Tests (Bun)        │ Pure functions, utilities    │
│ 2. Component Tests (Vitest)  │ React components, hooks      │
│ 3. Integration Tests (Vitest)│ API routes, workflows        │
│ 4. E2E Tests (Playwright)    │ Full user journeys          │
└─────────────────────────────────────────────────────────────┘
```

### 📊 Coverage Targets

| Test Type | Lines | Functions | Branches | Statements |
|-----------|-------|-----------|----------|------------|
| Logic     | 85%   | 85%       | 85%      | 85%        |
| Components| 75%   | 75%       | 75%      | 75%        |
| Integration| 70%  | 70%       | 70%      | 70%        |
| **Overall**| 80%  | 80%       | 80%      | 80%        |

## Test Execution

### 🚀 Commands

```bash
# Run all tests
bun run test

# Run specific test tiers
bun run test:unit:logic          # Bun logic tests
bun run test:unit:components     # Vitest component tests
bun run test:integration         # Vitest integration tests
bun run test:e2e                 # Playwright E2E tests

# Watch mode
bun run test:watch               # All tests in watch mode
bun run test:unit:logic:watch    # Logic tests only

# Coverage
bun run test:coverage            # Generate coverage for all tiers
bun run test:coverage:merge      # Merge coverage reports
```

### 📁 Test File Organization

```
tests/
├── unit/
│   ├── logic/              # Bun tests for utilities/logic
│   └── components/         # Vitest tests for React components
├── integration/            # Vitest integration tests
├── e2e/                   # Playwright E2E tests
└── mocks/                 # Shared test mocks
```

## Mocking Patterns

### 🎭 Bun Mocking (Logic Tests)

```typescript
import { beforeEach, describe, expect, it, mock } from 'bun:test'

describe('MyUtility', () => {
  beforeEach(() => {
    mock.restore()
  })

  it('should mock functions correctly', () => {
    const mockFn = mock()
    mockFn.mockReturnValue('mocked result')
    
    expect(mockFn()).toBe('mocked result')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should mock modules', () => {
    const mockFetch = mock(global.fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' })
    })
    
    // Test code using fetch
  })
})
```

### 🎨 Vitest Mocking (Component Tests)

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock external dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/test'
  })
}))

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

### 📝 Console Mocking (Standardized)

```typescript
// ✅ Correct pattern - Use consistent naming
describe('MyFunction', () => {
  let consoleSpy: ReturnType<typeof mock>

  beforeEach(() => {
    consoleSpy = mock(console.log)
  })

  afterEach(() => {
    mock.restore()
  })

  it('should log correctly', () => {
    myFunction()
    expect(consoleSpy).toHaveBeenCalledWith('Expected message')
  })
})
```

## Test Isolation

### 🔒 Environment Isolation

```typescript
// Each test file should be isolated
describe('MyTest', () => {
  beforeEach(() => {
    // Reset all mocks
    mock.restore()
    
    // Reset environment variables
    process.env = { ...originalEnv }
    
    // Reset DOM if needed
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // Cleanup after each test
    mock.restore()
  })
})
```

### 🧹 Cleanup Patterns

```typescript
// Async cleanup
describe('AsyncTest', () => {
  afterEach(async () => {
    // Wait for pending promises
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Cleanup resources
    await cleanupResources()
  })
})

// Timer cleanup
describe('TimerTest', () => {
  beforeEach(() => {
    mock.useFakeTimers()
  })

  afterEach(() => {
    mock.useRealTimers()
  })
})
```

## Component Testing

### ⚛️ React Component Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('MyComponent', () => {
  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    const mockOnClick = vi.fn()
    
    render(<MyComponent onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('should handle async operations', async () => {
    render(<MyAsyncComponent />)
    
    const button = screen.getByText('Load Data')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument()
    })
  })
})
```

### 🪝 Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react'

describe('useMyHook', () => {
  it('should update state correctly', () => {
    const { result } = renderHook(() => useMyHook())
    
    act(() => {
      result.current.updateValue('new value')
    })
    
    expect(result.current.value).toBe('new value')
  })

  it('should handle async operations', async () => {
    const { result } = renderHook(() => useMyAsyncHook())
    
    await act(async () => {
      await result.current.fetchData()
    })
    
    expect(result.current.data).toBeDefined()
  })
})
```

## Integration Testing

### 🔗 API Route Testing

```typescript
describe('API Route Integration', () => {
  it('should handle GET requests', async () => {
    const response = await fetch('/api/test')
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data).toEqual({ message: 'success' })
  })

  it('should handle POST requests with validation', async () => {
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' })
    })
    
    expect(response.ok).toBe(true)
  })
})
```

### 🌊 Workflow Testing

```typescript
describe('User Registration Workflow', () => {
  it('should complete registration flow', async () => {
    // Step 1: Create account
    const createResponse = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' })
    })
    
    expect(createResponse.ok).toBe(true)
    
    // Step 2: Verify email
    const verifyResponse = await fetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'verification-token' })
    })
    
    expect(verifyResponse.ok).toBe(true)
  })
})
```

## Error Handling

### 🚨 Error Testing Patterns

```typescript
describe('Error Handling', () => {
  it('should handle network errors', async () => {
    const mockFetch = mock(global.fetch)
    mockFetch.mockRejectedValue(new Error('Network error'))
    
    await expect(myApiCall()).rejects.toThrow('Network error')
  })

  it('should handle validation errors', async () => {
    const mockFetch = mock(global.fetch)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid input' })
    })
    
    const result = await myApiCall()
    expect(result.error).toBe('Invalid input')
  })
})
```

### 🛡️ Edge Case Testing

```typescript
describe('Edge Cases', () => {
  it('should handle empty inputs', () => {
    expect(myFunction('')).toBe(null)
    expect(myFunction(null)).toBe(null)
    expect(myFunction(undefined)).toBe(null)
  })

  it('should handle large inputs', () => {
    const largeInput = 'a'.repeat(10000)
    expect(() => myFunction(largeInput)).not.toThrow()
  })

  it('should handle concurrent operations', async () => {
    const promises = Array.from({ length: 100 }, () => myAsyncFunction())
    const results = await Promise.all(promises)
    
    expect(results).toHaveLength(100)
    expect(results.every(r => r.success)).toBe(true)
  })
})
```

## Performance Testing

### ⚡ Performance Patterns

```typescript
describe('Performance', () => {
  it('should complete within time limit', async () => {
    const start = performance.now()
    
    await myFunction()
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(1000) // 1 second
  })

  it('should handle memory efficiently', () => {
    const before = process.memoryUsage().heapUsed
    
    myFunction()
    
    const after = process.memoryUsage().heapUsed
    const increase = after - before
    
    expect(increase).toBeLessThan(10 * 1024 * 1024) // 10MB
  })
})
```

## Coverage Analysis

### 📊 Coverage Configuration

```javascript
// coverage.config.js
module.exports = {
  tiers: {
    logic: {
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 }
    },
    components: {
      thresholds: { lines: 75, functions: 75, branches: 75, statements: 75 }
    },
    integration: {
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 }
    }
  }
}
```

### 🎯 Coverage Reporting

```bash
# Generate coverage reports
bun run test:coverage

# Merge coverage from different tiers
bun run test:coverage:merge

# View coverage reports
open coverage/final-report/index.html
```

## Troubleshooting

### 🔍 Common Issues

#### Test Hanging
```typescript
// ❌ Problematic - Can cause hanging
describe('Hanging Test', () => {
  it('should not hang', async () => {
    // Missing await or timeout
    myAsyncFunction()
  })
})

// ✅ Fixed - Proper async handling
describe('Fixed Test', () => {
  it('should complete properly', async () => {
    await myAsyncFunction()
  }, { timeout: 5000 }) // Add timeout
})
```

#### Memory Leaks
```typescript
// ❌ Problematic - Memory leak
describe('Memory Leak', () => {
  let intervalId: NodeJS.Timeout

  it('should clean up', () => {
    intervalId = setInterval(() => {}, 100)
    // No cleanup
  })
})

// ✅ Fixed - Proper cleanup
describe('Cleaned Up', () => {
  let intervalId: NodeJS.Timeout

  afterEach(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })
})
```

#### Mock Inconsistencies
```typescript
// ❌ Problematic - Inconsistent mocking
const mockFetch = (global.fetch as any)

// ✅ Fixed - Consistent Bun mocking
const mockFetch = mock(global.fetch)
```

### 🛠️ Debugging Tips

1. **Use specific test names** for easy identification
2. **Add timeouts** to prevent hanging tests
3. **Clean up resources** in afterEach hooks
4. **Use consistent mocking patterns** across test files
5. **Check console output** for unhandled promises
6. **Monitor memory usage** during test runs

## Best Practices

### ✅ Do's

- ✅ Use descriptive test names
- ✅ Test one thing per test
- ✅ Clean up after each test
- ✅ Use consistent mocking patterns
- ✅ Test edge cases and error conditions
- ✅ Add timeouts for async tests
- ✅ Use proper async/await patterns

### ❌ Don'ts

- ❌ Don't test implementation details
- ❌ Don't use (fetch as any) patterns
- ❌ Don't forget to clean up resources
- ❌ Don't write tests that depend on each other
- ❌ Don't ignore coverage warnings
- ❌ Don't use inconsistent mock naming

## Continuous Integration

### 🔄 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:coverage
      - run: bun run test:coverage:merge
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/final-report/lcov.info
```

## Tools and Resources

### 🧰 Testing Tools

- **Bun Test**: Fast JavaScript test runner
- **Vitest**: Vite-native test framework
- **Testing Library**: React testing utilities
- **Playwright**: E2E testing framework
- **Istanbul**: Code coverage tool

### 📚 Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)

---

## Summary

This comprehensive testing strategy ensures:
- **High code quality** through multi-tier testing
- **Fast feedback** with watch mode and parallel execution
- **Consistent patterns** across all test types
- **Reliable coverage** reporting and validation
- **Maintainable tests** with proper isolation and cleanup

Follow these patterns to maintain a robust, reliable, and maintainable test suite.