# Testing Patterns Guide

This guide documents the standardized testing patterns established for the Bun-based test environment.

## 🎯 Test Runner Selection

### Bun Tests (Logic/Utility Tests)
Use Bun for:
- Pure utility functions
- Business logic
- Data transformations
- API utilities
- Schema validation
- Authentication logic (non-React)

**File patterns**: `lib/**/*.test.ts`, `src/lib/**/*.test.ts`, `src/schemas/**/*.test.ts`

### Vitest Tests (Component/Integration Tests)
Use Vitest for:
- React components
- React hooks
- Integration tests
- API route tests
- Workflow tests

**File patterns**: `**/*.test.{jsx,tsx}`, `components/**/*.test.*`, `tests/integration/**`

## 🔧 Standardized Mock Patterns

### Console Mocking (Bun)
```typescript
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

describe('MyFunction', () => {
  let consoleSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
    // or for warnings: spyOn(console, 'warn').mockImplementation(() => {})
    // or for errors: spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy?.mockRestore()
  })

  it('should log the expected message', () => {
    myFunction()
    expect(consoleSpy).toHaveBeenCalledWith('Expected message')
  })
})
```

### Fetch Mocking (Bun)
```typescript
import { mock } from 'bun:test'

describe('API Function', () => {
  beforeEach(() => {
    // Reset all mocks
    mock.restore()
  })

  it('should make API call', async () => {
    const fetchMock = mock(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    })

    const result = await myApiFunction()
    
    expect(fetchMock).toHaveBeenCalledWith('/api/endpoint')
    expect(result).toEqual({ data: 'test' })
  })
})
```

### Timer Mocking (Bun)
```typescript
import { describe, expect, it } from 'bun:test'

describe('Debounce Function', () => {
  it('should debounce function calls with real timers', async () => {
    const fn = mock()
    const debouncedFn = debounce(fn, 50)

    debouncedFn('call1')
    debouncedFn('call2')
    debouncedFn('call3')

    expect(fn).not.toHaveBeenCalled()

    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 60))

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('call3')
  })
})
```

## 📁 File Organization

### Test File Naming
- **Bun tests**: `*.test.ts` (TypeScript only)
- **Vitest tests**: `*.test.{ts,tsx,js,jsx}`
- **Integration tests**: `*.integration.test.{ts,tsx}`
- **E2E tests**: `*.e2e.test.{ts,tsx}`

### Directory Structure
```
lib/
├── utils.ts
├── utils.test.ts          # Bun test
├── auth.ts
└── auth.test.ts           # Bun test

components/
├── ui/
│   ├── button.tsx
│   └── button.test.tsx    # Vitest test
└── forms/
    ├── contact-form.tsx
    └── contact-form.test.tsx # Vitest test

tests/
├── integration/
│   ├── api/
│   └── workflows/
└── e2e/
    └── user-flows/
```

## 🎨 Test Structure Patterns

### Bun Test Structure
```typescript
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

describe('ModuleName', () => {
  // Setup/teardown
  beforeEach(() => {
    // Reset state
  })

  afterEach(() => {
    // Cleanup
  })

  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = functionName(input)
      
      // Assert
      expect(result).toBe('expected')
    })

    it('should handle edge case', () => {
      // Test edge cases
    })

    it('should handle error case', () => {
      // Test error handling
    })
  })
})
```

### Vitest Test Structure
```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('ComponentName', () => {
  it('should render with default props', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const handleClick = vi.fn()
    render(<ComponentName onClick={handleClick} />)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## 🔍 Coverage Patterns

### Bun Coverage
- Focuses on logic/utility functions
- Targets 85%+ coverage
- Excludes React components and JSX files

### Vitest Coverage
- Focuses on component rendering and interactions
- Includes integration test coverage
- Targets 80%+ coverage for components

## 🚀 Performance Patterns

### Bun Test Optimization
```typescript
// ✅ Use specific imports
import { describe, expect, it } from 'bun:test'

// ✅ Avoid heavy setup in beforeEach
beforeEach(() => {
  // Light setup only
})

// ✅ Use async/await for async tests
it('should handle async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### Vitest Test Optimization
```typescript
// ✅ Use vi.hoisted for module mocks
const mockFunction = vi.hoisted(() => vi.fn())

// ✅ Clean up after tests
afterEach(() => {
  vi.clearAllMocks()
})
```

## 🛠️ Common Patterns

### Environment Variable Testing
```typescript
describe('Environment Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should use environment variable', () => {
    process.env.TEST_VAR = 'test-value'
    const result = getConfig()
    expect(result.testVar).toBe('test-value')
  })
})
```

### Error Handling Testing
```typescript
it('should handle errors gracefully', () => {
  const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
  
  expect(() => {
    functionThatThrows()
  }).toThrow('Expected error message')
  
  expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error))
  consoleSpy.mockRestore()
})
```

### Async Function Testing
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toEqual(expectedResult)
})

it('should handle async errors', async () => {
  await expect(asyncFunctionThatFails()).rejects.toThrow('Error message')
})
```

## 📋 Best Practices

1. **Use descriptive test names** that explain what is being tested
2. **Follow AAA pattern** (Arrange, Act, Assert)
3. **Test one thing per test** - keep tests focused
4. **Use consistent naming** for console spies (`consoleSpy`)
5. **Clean up after tests** - restore mocks and reset state
6. **Use path aliases** (`@/lib/utils`) instead of relative imports
7. **Group related tests** with `describe` blocks
8. **Test edge cases** and error conditions
9. **Keep tests independent** - no test should depend on another
10. **Use meaningful assertions** - be specific about what you're testing

## 🔗 Related Documentation

- [Bun Testing Guide](./BUN_TESTING_GUIDE.md)
- [Testing Troubleshooting Guide](./TESTING_TROUBLESHOOTING_GUIDE.md)
- [Hybrid Testing Framework](./HYBRID_TESTING_FRAMEWORK.md)
