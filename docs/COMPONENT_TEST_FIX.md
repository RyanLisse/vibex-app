# Component Test Fix Documentation

## Issue Summary

Component tests were hanging indefinitely when running with Vitest due to a conflict between fake timers and async operations in the testing environment.

## Root Cause

1. **Fake Timers Issue**: The global `vitest.setup.ts` file was using `vi.useFakeTimers()` which causes tests to hang when dealing with:
   - Async component operations
   - Promise-based code
   - React Testing Library's async utilities
   - Module imports with side effects

2. **Vitest Configuration Conflict**: Even with isolated configs, Vitest was loading modules that triggered the hanging behavior.

## Solutions Implemented

### 1. Disabled Fake Timers (Temporary Fix)

Modified `vitest.setup.ts` to comment out fake timers:
```typescript
// TEMPORARILY DISABLED: Fake timers cause tests to hang with async operations
// if (!process.env.VITEST_INNGEST_TESTS) {
//   vi.useFakeTimers()
// }
```

### 2. Created Component-Specific Setup

Created `vitest.setup.components.ts` without fake timers:
- Includes all necessary mocks for React components
- Sets up test environment variables
- Mocks browser APIs (matchMedia, IntersectionObserver, etc.)
- No fake timers to avoid hanging

### 3. Alternative: Bun Test Runner

Added Bun test runner support for component tests:
```json
"test:unit:components": "bun test components/**/*.test.tsx hooks/**/*.test.tsx app/**/*.test.tsx --preload ./bun-component-test.setup.ts"
```

## Current Status

- **Vitest Issue**: Still investigating why Vitest hangs even with minimal configs
- **Workaround**: Disabled fake timers globally to allow tests to run
- **Alternative**: Bun test runner available but requires different mock syntax

## Recommendations

1. **Short Term**: Keep fake timers disabled until root cause is found
2. **Medium Term**: Investigate Vitest module loading to fix the hanging issue
3. **Long Term**: Consider migrating all tests to Bun for consistency

## Known Issues

1. Some tests may rely on fake timers for timing control
2. Bun test runner uses different mock syntax (`mock()` vs `vi.fn()`)
3. Coverage reports may need adjustment with different test runners

## Testing Commands

```bash
# Run component tests (currently using Bun)
bun run test:unit:components

# Run component tests with Vitest (after fix)
bun run test:unit:components:vitest

# Run all tests
bun run test
```

## References

- [Vitest Mocking Documentation](https://vitest.dev/guide/mocking)
- [Vitest Timer Mocks](https://vitest.dev/guide/mocking#timers)
- [React Testing Library Async](https://testing-library.com/docs/dom-testing-library/api-async/)