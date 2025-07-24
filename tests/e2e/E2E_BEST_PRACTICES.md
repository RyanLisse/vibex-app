# E2E Test Best Practices & Insights for Fixing Other Tests

## Key Success Factors of E2E Tests

### 1. Complete Test Framework Isolation
**E2E Success**: Uses Playwright, completely separate from Vitest
- **No module resolution conflicts**
- **No TypeScript compilation issues**
- **Own configuration file (`playwright.config.ts`)**
- **Dedicated test runner**

**Application to Unit/Integration Tests**:
- Consider using separate Vitest instances with completely isolated configs
- Avoid sharing any configuration between test types
- Use different test file patterns (`.unit.test.ts`, `.integration.test.ts`)

### 2. Clear Test Environment Setup
**E2E Success**: 
```typescript
webServer: {
  command: 'bun run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
}
```

**Application to Other Tests**:
- Unit tests: Mock all external dependencies
- Integration tests: Set up test databases/services before running
- Clear environment variables for each test type

### 3. Robust Error Handling
**E2E Success**: Graceful fallbacks when AI features unavailable
```typescript
if (!hasApiKey) {
  console.warn("⚠️  No OpenAI API key found. Stagehand AI features will be disabled.");
  // Use mock instead
}
```

**Application to Other Tests**:
- Implement similar fallback patterns
- Mock unavailable services instead of failing
- Provide clear warning messages

### 4. Test Data Management
**E2E Success**: Uses `data-testid` attributes consistently
```typescript
await page.click('[data-testid="tasks-nav"]');
await page.fill('[data-testid="task-title-input"]', "E2E Test Task");
```

**Application to Other Tests**:
- Use clear, consistent naming conventions
- Implement test data builders/factories
- Separate test data from test logic

### 5. Parallel Execution Control
**E2E Success**: 
```typescript
fullyParallel: true,
workers: process.env.CI ? 1 : undefined,
```

**Application to Other Tests**:
- Control parallelism based on environment
- Isolate tests that can't run in parallel
- Use proper test isolation (separate databases, etc.)

## Recommended Fixes for Unit/Integration Tests

### 1. Separate Vitest Configurations Completely
```typescript
// vitest.unit.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['**/*.unit.test.ts'],
    exclude: ['**/*.integration.test.ts', '**/*.e2e.test.ts'],
    globals: true,
    setupFiles: ['./tests/setup/unit.setup.ts'],
  }
});

// vitest.integration.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    exclude: ['**/*.unit.test.ts', '**/*.e2e.test.ts'],
    setupFiles: ['./tests/setup/integration.setup.ts'],
    pool: 'forks', // Better isolation
  }
});
```

### 2. Implement Test Type Detection
```typescript
// In test files
const TEST_TYPE = process.env.TEST_TYPE || 'unit';

if (TEST_TYPE !== 'integration') {
  test.skip('Integration test - skipping in unit mode');
}
```

### 3. Create Test-Specific Commands
```json
{
  "scripts": {
    "test:unit": "TEST_TYPE=unit vitest run --config vitest.unit.config.ts",
    "test:integration": "TEST_TYPE=integration vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test"
  }
}
```

### 4. Implement Proper Mocking Strategy
```typescript
// For unit tests
vi.mock('@/lib/database', () => ({
  db: createMockDatabase(),
}));

// For integration tests
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
```

### 5. Use Environment-Based Configuration
```typescript
// test.env.ts
export const getTestConfig = () => {
  const testType = process.env.TEST_TYPE;
  
  return {
    database: testType === 'unit' ? 'mock' : 'test-db',
    api: testType === 'unit' ? 'mock' : 'http://localhost:3001',
    timeout: testType === 'e2e' ? 30000 : 5000,
  };
};
```

## Summary

The E2E tests succeed because they:
1. Use a completely separate test framework (Playwright)
2. Have clear boundaries and no overlap with other tests
3. Handle errors gracefully with fallbacks
4. Use consistent patterns for element selection
5. Control execution environment properly

To fix unit/integration tests, apply these same principles:
1. Complete separation of test types
2. Clear configuration boundaries
3. Proper error handling and mocking
4. Consistent patterns and conventions
5. Environment-aware execution