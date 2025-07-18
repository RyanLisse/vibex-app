# Integration Testing Guide for VibeKit

## Overview

This guide covers the integration testing setup for VibeKit, focusing on testing complete workflows across multiple components, services, and API endpoints.

## Configuration

### Vitest Configuration

The project uses a dedicated Vitest configuration for integration tests:

- **Environment**: Node.js (for server-side testing)
- **Test Pattern**: `**/*.integration.test.{ts,tsx}` and `tests/integration/**/*.test.{ts,tsx}`
- **Coverage**: Separate coverage reports in `./coverage/integration/`
- **Timeouts**: Extended timeouts for integration scenarios (30s test, 15s hooks)

### Setup Files

Integration tests use `vitest.setup.ts` which provides:

- **Environment Variables**: All required env vars are mocked
- **API Mocking**: Global fetch mock for API testing
- **External Services**: Mocked integrations (OpenAI, Anthropic, GitHub, etc.)
- **Test Utilities**: Helper functions for common integration patterns

## Test Templates

### 1. API Route Testing (`api-route.integration.test.ts`)

Template for testing API endpoints with:
- Database integration
- External API calls
- Authentication flows
- Error handling
- Performance testing

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { integrationTestHelpers } from '../../../vitest.setup'

describe('API Route Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle complete API workflow', async () => {
    // Mock API response
    integrationTestHelpers.mockApiResponse('/api/example', { data: 'test' })
    
    const response = await fetch('/api/example')
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data).toEqual({ data: 'test' })
  })
})
```

### 2. Workflow Testing (`workflow.integration.test.ts`)

Template for testing complete user workflows:
- Multi-step processes
- Cross-component interactions
- Real-time updates
- Service orchestration

```typescript
describe('User Workflow Integration', () => {
  it('should complete OAuth flow end-to-end', async () => {
    // Step 1: Initiate OAuth
    // Step 2: Handle callback
    // Step 3: Verify authenticated state
  })
})
```

### 3. State Management Testing (`state-management.integration.test.ts`)

Template for testing state management across:
- Store updates from API responses
- Cross-store communication
- Persistence layer
- Real-time synchronization

```typescript
describe('State Management Integration', () => {
  it('should coordinate state changes across stores', () => {
    // Test cross-store communication
    // Verify state persistence
    // Check real-time updates
  })
})
```

## Helper Functions

### `integrationTestHelpers`

Utilities for common integration testing patterns:

```typescript
// Mock successful API response
integrationTestHelpers.mockApiResponse('/api/endpoint', { data: 'response' })

// Mock API error
integrationTestHelpers.mockApiError('/api/endpoint', { error: 'Failed' }, 500)

// Wait for next tick
await integrationTestHelpers.waitForNextTick()

// Advance timers
await integrationTestHelpers.advanceTimers(1000)
```

### Test Server

Create temporary HTTP servers for testing:

```typescript
import { createTestServer, getTestServerUrl } from '../../../vitest.setup'

const serverUrl = createTestServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Test server response' }))
})
```

## Migration Strategy

### From Unit Tests to Integration Tests

1. **Identify Integration Test Candidates**:
   - Tests that mock multiple dependencies
   - Tests involving API calls
   - Tests with cross-component interactions
   - Tests requiring database or external services

2. **File Naming Convention**:
   - Change `*.test.ts` to `*.integration.test.ts`
   - Move to `tests/integration/` directory
   - Group by feature or workflow

3. **Test Refactoring**:
   - Replace component mocks with real implementations
   - Use API mocking instead of service mocking
   - Test complete workflows instead of isolated functions
   - Add error handling and edge case testing

### Example Migration

**Before (Unit Test)**:
```typescript
// components/TaskList.test.tsx
import { render, screen } from '@testing-library/react'
import { TaskList } from './TaskList'

vi.mock('@/stores/tasks', () => ({
  useTaskStore: () => ({ tasks: mockTasks })
}))

it('renders tasks', () => {
  render(<TaskList />)
  expect(screen.getByText('Task 1')).toBeInTheDocument()
})
```

**After (Integration Test)**:
```typescript
// tests/integration/task-management.integration.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import { TaskList } from '@/components/TaskList'
import { integrationTestHelpers } from '../../vitest.setup'

it('loads and displays tasks from API', async () => {
  integrationTestHelpers.mockApiResponse('/api/tasks', {
    tasks: [{ id: 1, title: 'Task 1' }]
  })

  render(<TaskList />)
  
  await waitFor(() => {
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })
})
```

## Best Practices

### 1. Test Real Workflows

Focus on testing complete user journeys:
- Authentication → Task Creation → Execution → Completion
- Real-time updates across components
- Error recovery and graceful degradation

### 2. Mock External Dependencies

Mock external services but test internal integration:
- GitHub API responses
- OpenAI completions
- Database operations
- WebSocket connections

### 3. Test Error Conditions

Include comprehensive error testing:
- Network failures
- API rate limits
- Invalid responses
- Timeout scenarios

### 4. Performance Considerations

Test performance characteristics:
- Large data sets
- Concurrent operations
- Memory usage
- Response times

### 5. Cleanup and Isolation

Ensure tests don't interfere with each other:
- Clear mocks between tests
- Reset state stores
- Close connections
- Clean up timers

## Running Integration Tests

### Commands

```bash
# Run all integration tests
npm run test:integration

# Run integration tests with coverage
npm run test:integration --coverage

# Run integration tests in watch mode
npm run test:integration:watch

# Run specific integration test file
npm run test:integration -- workflow.integration.test.ts
```

### Environment Variables

Integration tests run with these environment variables:

```bash
NODE_ENV=test
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret
DATABASE_URL=postgresql://test:test@localhost:5432/test
GITHUB_CLIENT_ID=test-github-client-id
GITHUB_CLIENT_SECRET=test-github-client-secret
OPENAI_API_KEY=test-openai-api-key
ANTHROPIC_API_KEY=test-anthropic-api-key
GEMINI_API_KEY=test-gemini-api-key
```

## Coverage Requirements

Integration tests should maintain:
- **Lines**: 70% coverage minimum
- **Functions**: 70% coverage minimum
- **Branches**: 70% coverage minimum
- **Statements**: 70% coverage minimum

Coverage focuses on:
- API route handlers
- Service integration points
- Cross-component workflows
- Error handling paths

## Debugging

### Common Issues

1. **Mock Conflicts**: Clear mocks between tests
2. **Async Timing**: Use `waitFor` for async operations
3. **State Pollution**: Reset stores and cleanup
4. **Network Errors**: Check mock setup

### Debug Tools

```typescript
// Enable debug logging
vi.stubEnv('DEBUG', 'integration:*')

// Log mock calls
console.log(vi.mocked(fetch).mock.calls)

// Check store state
console.log(store.getState())
```

## Continuous Integration

Integration tests run in CI with:
- Parallel execution disabled (for database tests)
- Extended timeouts
- Retry on flaky tests
- Coverage reporting

## Future Enhancements

1. **Database Integration**: Add real database testing
2. **E2E Bridge**: Connect with Playwright tests
3. **Performance Benchmarking**: Add performance regression testing
4. **Visual Testing**: Add screenshot comparison
5. **Load Testing**: Add concurrent user simulation