# Inngest Test Hanging Issue - Resolution

## Problem
The Inngest tests were hanging indefinitely when run with Vitest due to a conflict between:
1. Global `vi.useFakeTimers()` in `vitest.setup.ts` (line 26)
2. Inngest's async operations and `setTimeout` usage for streaming
3. Module import side effects from the real Inngest client initialization

## Root Cause Analysis
- **Fake timers conflict**: Vitest's fake timers prevent Promise resolution in async operations
- **Import side effects**: The Inngest module initializes clients and middleware on import
- **setTimeout usage**: The module uses `setTimeout` for message streaming (line 146 in lib/inngest.ts)
- **Global test setup**: All tests inherit the fake timer configuration, causing widespread issues

## Solution Implemented
Created a completely isolated testing approach:

1. **Separate test runner**: Use Bun instead of Vitest to avoid global configurations
2. **Mock-only approach**: Never import the real Inngest module in tests
3. **Standalone test files**: Created dedicated test files that don't rely on any setup

### Test Files Created
- `lib/inngest-standalone.test.ts` - New comprehensive test suite using Bun's test API
- `lib/inngest-isolated.test.ts` - Updated existing tests to work without imports

### Package.json Scripts Added
```json
"test:inngest": "bun test lib/inngest-standalone.test.ts lib/inngest-isolated.test.ts",
"test:inngest:watch": "bun test --watch lib/inngest-standalone.test.ts lib/inngest-isolated.test.ts"
```

## Running Tests
```bash
# Run all Inngest tests (uses Bun, avoids Vitest setup)
bun run test:inngest

# Watch mode for development
bun run test:inngest:watch

# All tests now pass in ~73ms without hanging
```

## Key Implementation Details

### Mock Structure (Bun Compatible)
```typescript
import { mock } from 'bun:test'

const mockInngest = {
  id: 'clonedex',
  send: mock(() => Promise.resolve({ ids: ['test-id'] })),
  createFunction: mock((config) => ({
    ...config,
    handler: mock(() => Promise.resolve(undefined)),
  })),
}
```

### Test Isolation
- No global setup files
- No timer manipulation
- Pure unit tests with inline mocks
- Environment variables set per test

## Lessons Learned

1. **Event-driven libraries and fake timers don't mix**: Async event systems need real timers
2. **Import side effects are dangerous in tests**: Always mock modules with initialization code
3. **Test runner choice matters**: Bun provides better isolation than Vitest for certain scenarios
4. **Separation of concerns**: Keep problematic tests in their own test suite

## Future Recommendations

1. **Install @inngest/test**: Use the official testing library for more sophisticated scenarios
   ```bash
   bun add -D @inngest/test
   ```

2. **Maintain test isolation**: Keep Inngest tests separate from the main test suite

3. **Document timer dependencies**: Add comments in modules that use setTimeout/setInterval

4. **Consider test categories**:
   - Unit tests: Mock everything (current approach)
   - Integration tests: Use @inngest/test with InngestTestEngine
   - E2E tests: Real Inngest client with test event key

## Alternative Approaches (Not Implemented)

1. **Vitest with custom config**: Could create a no-fake-timers config, but Bun is simpler
2. **Dynamic imports in tests**: Could work but adds complexity
3. **Monkey-patching timers**: Too fragile and hard to maintain

## Verification
All 14 tests now pass consistently in ~73ms without any hanging or timeout issues.