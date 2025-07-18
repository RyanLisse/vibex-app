# Inngest Mock Solution for Preventing Test Hanging

## Problem Analysis

The Inngest tests are hanging due to several issues:

1. **Module-level side effects**: The `lib/inngest.ts` file creates Inngest instances and channels at the module level
2. **setTimeout usage**: The streaming functionality uses `setTimeout` for chunking messages
3. **Async event-driven architecture**: Inngest's pub/sub pattern creates persistent connections
4. **Import side effects**: Simply importing the module triggers instance creation

## Solution Strategy

### 1. Enhanced Mock Setup (vitest.setup.inngest.ts)

```typescript
// Key improvements:
- Mock all Inngest dependencies BEFORE any imports
- Override setTimeout to execute immediately via queueMicrotask
- Provide complete mock implementations for all async operations
- Track timer IDs to ensure cleanup
```

### 2. Mock Implementation Details

#### Inngest Core Mock
- Prevents real Inngest instance creation
- Returns resolved promises immediately
- No network connections or event loops

#### Realtime Mock
- Mock channel returns synchronous responses
- No WebSocket connections
- No event listeners that could hang

#### VibeKit Mock
- Executes callbacks immediately without delays
- No sandbox connections
- Synchronous response simulation

#### Timer Override
- `setTimeout` executes callbacks via `queueMicrotask`
- Maintains async behavior without delays
- Proper cleanup in afterEach

### 3. Test Configuration

The `vitest.inngest.config.ts` must:
- Use the correct setup file: `vitest.setup.inngest.ts`
- Include all Inngest-related test files
- Set reasonable timeouts (10s)
- Use thread pool for isolation

### 4. Best Practices for Inngest Tests

1. **Never import the real module**: Always use dynamic imports after mocks are set up
2. **Clear mocks between tests**: Use `vi.clearAllMocks()` in beforeEach
3. **Verify async completion**: Add timing checks to ensure no hanging
4. **Mock all external dependencies**: Database, AI services, etc.

### 5. Example Test Pattern

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('inngest feature', () => {
  let inngestModule: any
  
  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import ensures mocks are applied
    inngestModule = await import('@/lib/inngest')
  })
  
  it('should complete without hanging', async () => {
    const { inngest } = inngestModule
    const result = await inngest.send({ name: 'test', data: {} })
    expect(result).toEqual({ ids: ['test-id'] })
  })
})
```

### 6. Troubleshooting

If tests still hang:
1. Check for any remaining `setTimeout` usage
2. Verify all promises resolve
3. Look for event listeners that aren't cleaned up
4. Ensure no real network connections are made
5. Check for circular dependencies

### 7. Alternative Approach

If mocking continues to be problematic, consider:
1. Creating a separate `inngest-testable.ts` with dependency injection
2. Using a factory pattern to avoid module-level instances
3. Implementing a test mode flag in the actual module

## Implementation Checklist

- [x] Mock all Inngest core modules
- [x] Override global timers
- [x] Provide complete async mock implementations
- [x] Configure Vitest properly
- [x] Document the solution
- [ ] Run all Inngest tests successfully
- [ ] Verify no hanging in CI/CD