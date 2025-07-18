# Testing Troubleshooting Guide - CodeX Clone

## Quick Reference

### 🚨 Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Hanging Tests | Tests never complete | Add timeouts, check async patterns |
| Memory Leaks | Tests slow down over time | Clean up resources in afterEach |
| Mock Inconsistencies | Tests fail randomly | Standardize mocking patterns |
| Environment Contamination | Tests interfere with each other | Improve test isolation |

## Test Execution Issues

### 🔄 Hanging Tests

#### Symptoms
- Tests run indefinitely without completing
- CI/CD pipelines timeout
- Watch mode becomes unresponsive

#### Common Causes
```typescript
// ❌ Missing await
it('should complete', async () => {
  myAsyncFunction() // Missing await
})

// ❌ Unresolved promises
it('should handle promises', () => {
  return new Promise(() => {
    // Promise never resolves
  })
})

// ❌ Infinite loops
it('should not loop forever', () => {
  while (true) {
    // Never breaks
  }
})
```

#### Solutions
```typescript
// ✅ Proper async handling
it('should complete', async () => {
  await myAsyncFunction()
}, { timeout: 5000 })

// ✅ Resolved promises
it('should handle promises', () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 100)
  })
})

// ✅ Proper cleanup
it('should clean up timers', () => {
  const timerId = setTimeout(() => {}, 1000)
  clearTimeout(timerId)
})
```

### 🧠 Memory Leaks

#### Symptoms
- Tests become slower over time
- Memory usage increases continuously
- System becomes unresponsive

#### Common Causes
```typescript
// ❌ Uncleaned intervals
describe('Memory Leak', () => {
  it('should not leak', () => {
    setInterval(() => {}, 100) // Never cleared
  })
})

// ❌ Event listeners not removed
describe('Event Leak', () => {
  it('should not leak listeners', () => {
    window.addEventListener('click', handler)
    // Never removed
  })
})
```

#### Solutions
```typescript
// ✅ Proper cleanup
describe('Clean Test', () => {
  let intervalId: NodeJS.Timeout

  afterEach(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })

  it('should clean up', () => {
    intervalId = setInterval(() => {}, 100)
  })
})

// ✅ Event cleanup
describe('Event Cleanup', () => {
  afterEach(() => {
    window.removeEventListener('click', handler)
  })
})
```

### 🎭 Mock Issues

#### Symptoms
- Tests fail with "mockReturnValue is not a function"
- Inconsistent test results
- Mocks not resetting between tests

#### Common Causes
```typescript
// ❌ Inconsistent mocking patterns
const mockFetch = (global.fetch as any)
const consoleLogSpy = vi.fn()
const mockFunction = jest.fn()

// ❌ Not resetting mocks
describe('Mock Issues', () => {
  it('first test', () => {
    mockFn.mockReturnValue('first')
  })
  
  it('second test', () => {
    // Mock still has 'first' value
  })
})
```

#### Solutions
```typescript
// ✅ Consistent Bun mocking
const mockFetch = mock(global.fetch)
const consoleSpy = mock(console.log)

// ✅ Proper mock reset
describe('Clean Mocks', () => {
  beforeEach(() => {
    mock.restore()
  })
})

// ✅ Vitest mocking
describe('Vitest Mocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
})
```

## Environment Issues

### 🌐 Test Isolation Problems

#### Symptoms
- Tests pass individually but fail together
- Random test failures
- Environment variables persist between tests

#### Common Causes
```typescript
// ❌ Shared state
let globalState = {}

describe('Shared State', () => {
  it('modifies global state', () => {
    globalState.value = 'test1'
  })
  
  it('depends on global state', () => {
    expect(globalState.value).toBe('test1') // Flaky
  })
})

// ❌ Environment pollution
describe('Environment Pollution', () => {
  it('modifies env', () => {
    process.env.NODE_ENV = 'test'
  })
  
  it('expects clean env', () => {
    expect(process.env.NODE_ENV).toBe('development') // Fails
  })
})
```

#### Solutions
```typescript
// ✅ Isolated state
describe('Isolated Tests', () => {
  let localState: any

  beforeEach(() => {
    localState = {}
  })

  it('uses local state', () => {
    localState.value = 'test1'
  })
})

// ✅ Environment isolation
describe('Clean Environment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })
})
```

### 🔧 Configuration Problems

#### Symptoms
- Tests can't find modules
- Import errors
- Configuration not loaded

#### Common Causes
```typescript
// ❌ Wrong import paths
import { myFunction } from '../../../lib/utils'

// ❌ Missing configuration
// No tsconfig.json or vitest.config.ts
```

#### Solutions
```typescript
// ✅ Use path aliases
import { myFunction } from '@/lib/utils'

// ✅ Proper configuration
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## React Testing Issues

### ⚛️ Component Testing Problems

#### Symptoms
- "act" warnings in console
- State updates not reflecting
- Events not firing

#### Common Causes
```typescript
// ❌ Missing act wrapper
it('should update state', () => {
  const { result } = renderHook(() => useMyHook())
  
  result.current.updateState('new value') // Missing act
})

// ❌ Not waiting for async updates
it('should load data', async () => {
  render(<MyComponent />)
  fireEvent.click(screen.getByText('Load'))
  
  expect(screen.getByText('Data loaded')).toBeInTheDocument()
  // Should wait for async operation
})
```

#### Solutions
```typescript
// ✅ Proper act usage
it('should update state', () => {
  const { result } = renderHook(() => useMyHook())
  
  act(() => {
    result.current.updateState('new value')
  })
})

// ✅ Wait for async updates
it('should load data', async () => {
  render(<MyComponent />)
  fireEvent.click(screen.getByText('Load'))
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### 🪝 Hook Testing Issues

#### Symptoms
- Hook state not updating
- Infinite re-renders
- Dependency warnings

#### Common Causes
```typescript
// ❌ Missing dependency
useEffect(() => {
  fetchData()
}, []) // Missing dependency

// ❌ Not handling async properly
const { result } = renderHook(() => useMyHook())
result.current.asyncOperation() // Not awaited
```

#### Solutions
```typescript
// ✅ Proper dependencies
useEffect(() => {
  fetchData()
}, [dependency])

// ✅ Async handling
it('should handle async', async () => {
  const { result } = renderHook(() => useMyHook())
  
  await act(async () => {
    await result.current.asyncOperation()
  })
})
```

## Coverage Issues

### 📊 Coverage Problems

#### Symptoms
- Low coverage despite having tests
- Files not included in coverage
- Incorrect coverage percentages

#### Common Causes
```typescript
// ❌ Files not included
// coverage.config.js
include: [
  'src/**/*.ts'
  // Missing 'lib/**/*.ts'
]

// ❌ Tests not covering branches
function myFunction(condition: boolean) {
  if (condition) {
    return 'true'
  }
  // Missing else case test
}
```

#### Solutions
```typescript
// ✅ Comprehensive includes
include: [
  'src/**/*.ts',
  'lib/**/*.ts',
  'components/**/*.tsx'
]

// ✅ Branch coverage
it('should cover all branches', () => {
  expect(myFunction(true)).toBe('true')
  expect(myFunction(false)).toBe('false')
})
```

## Performance Issues

### ⚡ Slow Tests

#### Symptoms
- Tests take a long time to run
- Watch mode is slow
- CI/CD pipelines are slow

#### Common Causes
```typescript
// ❌ Synchronous operations
it('should be fast', () => {
  for (let i = 0; i < 1000000; i++) {
    heavyOperation()
  }
})

// ❌ Real network requests
it('should fetch data', async () => {
  const response = await fetch('https://api.example.com')
  // Real network request
})
```

#### Solutions
```typescript
// ✅ Optimize operations
it('should be fast', () => {
  // Use smaller datasets for tests
  heavyOperation(smallDataset)
})

// ✅ Mock network requests
it('should fetch data', async () => {
  const mockFetch = mock(global.fetch)
  mockFetch.mockResolvedValue({ json: () => ({ data: 'mock' }) })
  
  const response = await fetch('https://api.example.com')
})
```

## Debugging Strategies

### 🔍 Debugging Techniques

#### Console Debugging
```typescript
// ✅ Strategic console logging
it('should debug issue', () => {
  console.log('Input:', input)
  const result = myFunction(input)
  console.log('Output:', result)
  expect(result).toBe(expected)
})
```

#### Test Isolation
```typescript
// ✅ Run single test
it.only('should debug this specific test', () => {
  // Test code
})

// ✅ Skip problematic tests temporarily
it.skip('should fix this later', () => {
  // Problematic test
})
```

#### Error Boundaries
```typescript
// ✅ Catch and log errors
it('should handle errors', () => {
  try {
    myFunction()
  } catch (error) {
    console.error('Error details:', error)
    throw error
  }
})
```

## Tools and Commands

### 🛠️ Debugging Commands

```bash
# Run single test file
bun test specific-test.test.ts

# Run tests with verbose output
bun test --verbose

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch

# Run tests with timeout
bun test --timeout 10000

# Debug Vitest tests
vitest --inspect-brk

# Run specific test pattern
bun test --grep "should handle errors"
```

### 🔧 Useful Tools

#### Test Explorer
```bash
# Use test explorer in VS Code
# Install "Test Explorer UI" extension
```

#### Coverage Analysis
```bash
# Generate detailed coverage report
bun run test:coverage
open coverage/html/index.html
```

#### Memory Analysis
```bash
# Monitor memory usage
node --inspect-brk node_modules/.bin/vitest
```

## Prevention Strategies

### 🛡️ Best Practices

1. **Write tests first** (TDD approach)
2. **Use consistent patterns** across test files
3. **Clean up resources** in afterEach hooks
4. **Add timeouts** to prevent hanging
5. **Mock external dependencies** consistently
6. **Use proper async patterns** with await
7. **Isolate test environments** properly
8. **Monitor test performance** regularly

### 📋 Pre-commit Checklist

- [ ] All tests pass locally
- [ ] No hanging tests
- [ ] Mocks are consistent
- [ ] Resources are cleaned up
- [ ] Coverage thresholds met
- [ ] No console errors
- [ ] Tests are isolated
- [ ] Async patterns are correct

### 🔄 Regular Maintenance

- **Weekly**: Review slow tests and optimize
- **Monthly**: Update testing dependencies
- **Quarterly**: Review and update testing patterns
- **As needed**: Fix flaky tests immediately

## Getting Help

### 📞 Support Channels

1. **Check this guide** for common issues
2. **Review test logs** for specific errors
3. **Use debugging tools** to isolate problems
4. **Ask team members** for second opinions
5. **Document new solutions** for future reference

### 📚 Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Vitest Troubleshooting](https://vitest.dev/guide/troubleshooting.html)
- [Testing Library Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest/Vitest Migration Guide](https://vitest.dev/guide/migration.html)

---

## Summary

This troubleshooting guide covers the most common testing issues and their solutions. Remember:

- **Stay consistent** with patterns and practices
- **Clean up properly** after each test
- **Use proper async handling** throughout
- **Monitor performance** and optimize regularly
- **Document solutions** for team knowledge

When in doubt, start with the simplest solution and work your way up to more complex debugging techniques.