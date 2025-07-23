# Test Setup Migration Guide

This guide helps migrate from duplicated test setup patterns to the consolidated test utilities.

## Quick Migration

### Before (Duplicated Setup)
```typescript
// In multiple test files
import { vi } from "vitest";

// Mock fetch
global.fetch = vi.fn();

// Mock console
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock localStorage
Object.defineProperty(global, "localStorage", {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

// ... more duplicated setup
```

### After (Consolidated Setup)
```typescript
// In test files
import { testPresets, setupTestEnvironment } from "@/lib/test-utils/consolidated-setup";

// Option 1: Use preset
const mocks = testPresets.unit();

// Option 2: Custom configuration
const mocks = setupTestEnvironment({
  nodeEnv: "test",
  mockFetch: true,
  mockConsole: true,
  mockStorage: true,
});
```

## Available Presets

### `testPresets.unit()`
- For pure business logic tests
- Mocks: fetch, console, performance, storage
- Environment: Node.js test environment

### `testPresets.component()`
- For React component tests
- Includes all unit test mocks plus:
- Next.js router mocks
- Browser API mocks (ResizeObserver, matchMedia, etc.)

### `testPresets.integration()`
- For integration tests
- Includes database setup
- Inngest and telemetry keys
- Real console for debugging

### `testPresets.api()`
- For API route tests
- Service mocks
- Environment variables

## Custom Configuration

```typescript
import { setupTestEnvironment } from "@/lib/test-utils/consolidated-setup";

const mocks = setupTestEnvironment({
  nodeEnv: "test",
  mockFetch: true,
  mockConsole: false, // Keep real console
  mockPerformance: true,
  mockStorage: true,
  inngestKeys: true,
  telemetryKeys: false,
  databaseUrl: "custom://url",
});
```

## Test Setup Factory

For complex test scenarios:

```typescript
import { createTestSetup } from "@/lib/test-utils/consolidated-setup";

const { beforeEach, afterEach } = createTestSetup(
  () => {
    // Setup logic
    return { database: mockDb, redis: mockRedis };
  },
  (instance) => {
    // Cleanup logic
    instance.database.close();
    instance.redis.disconnect();
  }
);
```

## Migration Checklist

- [ ] Replace duplicated mock setup with consolidated utilities
- [ ] Update test configuration files to use simplified setup
- [ ] Remove redundant setup files
- [ ] Update vitest/jest configs to use new setup files
- [ ] Test that all existing tests still pass

## Files to Update

1. `test-setup.ts` - Main setup file
2. `tests/setup/*.ts` - Individual setup files
3. `vitest.config.ts` - Test configuration
4. `jest.config.js` - Jest configuration (if used)
5. Individual test files with inline setup

## Benefits

- ✅ Reduced code duplication
- ✅ Consistent test environment
- ✅ Easier maintenance
- ✅ Better type safety
- ✅ Configurable setup options
- ✅ Reusable test utilities
