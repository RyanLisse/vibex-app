# Complete Testing Troubleshooting Guide

This guide provides solutions to common testing issues in the Bun-based test environment.

## 🚨 Critical Issues & Solutions

### Test Execution Hanging

#### Symptoms
- Tests run indefinitely without completing
- Process needs to be manually killed
- No error messages, just hangs

#### Root Causes & Solutions

**1. React Component Tests in Bun Scope**
```bash
# ❌ Problem: React components being tested by Bun
# Solution: Check bunfig.toml exclude patterns
```

**Fix**: Ensure `bunfig.toml` has proper exclusions:
```toml
exclude = [
  "**/*.test.{jsx,tsx}",
  "components/**/*.test.{js,jsx,ts,tsx}",
  "app/**/*.test.{js,jsx,ts,tsx}",
  "hooks/**/*.test.{js,jsx,ts,tsx}"
]
```

**2. Environment Contamination**
```typescript
// ❌ Problem: Tests affecting each other
beforeEach(() => {
  // Missing cleanup
})

// ✅ Solution: Proper cleanup
beforeEach(() => {
  mock.restore()
  process.env = { ...originalEnv }
})
```

### Console Spy Issues

#### Symptoms
- `ReferenceError: consoleLogSpy is not defined`
- `ReferenceError: consoleWarnSpy is not defined`
- Console spy not intercepting calls

#### Solutions

**1. Inconsistent Naming**
```typescript
// ❌ Problem: Mixed naming conventions
let consoleLogSpy: ReturnType<typeof spyOn>
let consoleWarnSpy: ReturnType<typeof spyOn>

// ✅ Solution: Consistent naming
let consoleSpy: ReturnType<typeof spyOn>
```

**2. Wrong Console Method**
```typescript
// ❌ Problem: Spying on wrong method
consoleSpy = spyOn(console, 'log')
// But function calls console.warn

// ✅ Solution: Match the actual call
consoleSpy = spyOn(console, 'warn')
```

**3. Missing Implementation**
```typescript
// ❌ Problem: Function doesn't actually log
export function myFunction() {
  // Missing console.log call
}

// ✅ Solution: Implement the logging
export function myFunction() {
  console.log('Expected message')
}
```

### Mock API Issues

#### Symptoms
- `TypeError: mock.useFakeTimers is not a function`
- `TypeError: mocked is not a function`
- `(fetch as any)` type errors

#### Solutions

**1. Vitest API in Bun Tests**
```typescript
// ❌ Problem: Using Vitest API in Bun
import { vi } from 'vitest'
vi.mock()

// ✅ Solution: Use Bun API
import { mock } from 'bun:test'
mock()
```

**2. Timer Mocking**
```typescript
// ❌ Problem: Vitest timer API
mock.useFakeTimers()
mock.advanceTimersByTime(100)

// ✅ Solution: Real timers in Bun
await new Promise(resolve => setTimeout(resolve, 100))
```

**3. Fetch Mocking**
```typescript
// ❌ Problem: Type casting
(global.fetch as any).mockResolvedValue()

// ✅ Solution: Proper Bun mocking
const fetchMock = mock(global.fetch)
fetchMock.mockResolvedValue()
```

### Path Alias Issues

#### Symptoms
- `Cannot resolve module '@/lib/utils'`
- Import errors with `@/` paths
- TypeScript compilation errors

#### Solutions

**1. Missing Bun Configuration**
```toml
# ❌ Problem: No path aliases in bunfig.toml

# ✅ Solution: Add to bunfig.toml
[test.alias]
"@" = "./"
"@/lib" = "./lib"
"@/components" = "./components"
```

**2. Mismatched Configurations**
```typescript
// ❌ Problem: Different aliases in different configs
// tsconfig.json: "@/*": ["./*"]
// vitest.config.ts: "@": "./src"

// ✅ Solution: Consistent aliases everywhere
"@": "./"
"@/lib": "./lib"
```

### Import/Export Issues

#### Symptoms
- `Export named 'functionName' not found`
- Module resolution errors
- Undefined imports

#### Solutions

**1. Missing Exports**
```typescript
// ❌ Problem: Function not exported
function myFunction() {}

// ✅ Solution: Export the function
export function myFunction() {}
```

**2. Wrong Import Path**
```typescript
// ❌ Problem: Incorrect path
import { myFunction } from './wrong-path'

// ✅ Solution: Correct path or alias
import { myFunction } from '@/lib/utils'
```

## 🔧 Configuration Issues

### Bun Configuration Problems

#### bunfig.toml Issues
```toml
# ❌ Common mistakes
[test]
# Missing environment
# Missing setup files
# Wrong include/exclude patterns

# ✅ Correct configuration
[test]
environment = "happy-dom"
setup = ["./bun-test-setup.ts"]
include = ["lib/**/*.test.ts"]
exclude = ["**/*.test.{jsx,tsx}"]
```

### Test Runner Selection Issues

#### Wrong Test Runner
```bash
# ❌ Problem: Running React tests with Bun
bun test components/button.test.tsx

# ✅ Solution: Use appropriate runner
bun test lib/utils.test.ts        # Bun for logic
npm run test:components           # Vitest for React
```

## 🐛 Debugging Strategies

### Debug Mode
```bash
# Enable Bun debug mode
BUN_DEBUG=1 bun test

# Verbose output
bun test --verbose

# Run specific test
bun test lib/utils.test.ts
```

### Isolation Testing
```bash
# Test one file at a time
bun test lib/telemetry.test.ts

# Check test patterns
bun test --dry-run
```

### Mock Debugging
```typescript
// Debug mock calls
it('should call function', () => {
  myFunction()
  console.log('Mock calls:', mockFn.mock.calls)
  expect(mockFn).toHaveBeenCalled()
})
```

## 📊 Coverage Issues

### Missing Coverage
```bash
# ❌ Problem: No coverage generated
bun test

# ✅ Solution: Enable coverage
bun test --coverage
```

### Coverage Configuration
```toml
# bunfig.toml
[test]
coverage = true
coverage_dir = "./coverage/bun-logic"
coverage_include = ["lib/**/*.{js,ts}"]
coverage_exclude = ["**/*.test.ts"]
```

## 🚀 Performance Issues

### Slow Tests
```typescript
// ❌ Problem: Heavy setup in beforeEach
beforeEach(async () => {
  await heavySetup()
})

// ✅ Solution: Light setup only
beforeEach(() => {
  mock.restore()
})
```

### Memory Issues
```typescript
// ❌ Problem: Not cleaning up
afterEach(() => {
  // Missing cleanup
})

// ✅ Solution: Proper cleanup
afterEach(() => {
  mock.restore()
  consoleSpy?.mockRestore()
})
```

## 🔍 Quick Diagnostic Checklist

### Before Running Tests
- [ ] Check test file is in correct location
- [ ] Verify test runner selection (Bun vs Vitest)
- [ ] Confirm imports are correct
- [ ] Check path aliases are configured

### When Tests Fail
- [ ] Read error message carefully
- [ ] Check console spy setup
- [ ] Verify mock configuration
- [ ] Confirm function implementations exist
- [ ] Check environment variable setup

### When Tests Hang
- [ ] Check for React components in Bun tests
- [ ] Verify exclude patterns in bunfig.toml
- [ ] Look for infinite loops or missing awaits
- [ ] Check timer mocking issues

## 📞 Getting Help

### Common Commands
```bash
# Run specific test file
bun test lib/utils.test.ts

# Run with coverage
bun test --coverage

# Debug mode
BUN_DEBUG=1 bun test

# Dry run (see what would be tested)
bun test --dry-run
```

### Log Analysis
```bash
# Check what files are being tested
bun test --dry-run | grep "\.test\."

# Verify configuration
cat bunfig.toml | grep -A 10 "\[test\]"
```

## 🔗 Related Resources

- [Testing Patterns Guide](./TESTING_PATTERNS_GUIDE.md)
- [Bun Testing Guide](./BUN_TESTING_GUIDE.md)
- [Hybrid Testing Framework](./HYBRID_TESTING_FRAMEWORK.md)
