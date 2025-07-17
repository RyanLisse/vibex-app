# Testing Guide for VibeKit

This guide covers the comprehensive testing framework setup for the VibeKit project, including unit testing, integration testing, component testing, and end-to-end testing.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Stack](#testing-stack)
3. [Test Types](#test-types)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [TDD Workflow](#tdd-workflow)
7. [Best Practices](#best-practices)

## Testing Philosophy

We follow a test-driven development (TDD) approach with the following principles:

- **Write tests first**: Define expected behavior before implementation
- **Test at multiple levels**: Unit, integration, and E2E tests
- **Keep tests simple**: Each test should verify one behavior
- **Fast feedback**: Tests should run quickly and provide clear results
- **High coverage**: Aim for 80%+ code coverage

## Testing Stack

### Core Testing Tools

- **Vitest**: Fast unit test runner with Jest compatibility
- **React Testing Library**: Component testing with user-centric approach
- **Playwright**: Cross-browser E2E testing
- **Storybook**: Component development and visual testing
- **@browserbasehq/stagehand**: AI-powered browser automation

### Testing Utilities

- **@testing-library/user-event**: Simulating user interactions
- **@testing-library/jest-dom**: Custom matchers for DOM testing
- **jsdom**: DOM implementation for Node.js
- **@vitejs/plugin-react**: React support for Vitest

## Test Types

### 1. Unit Tests
Test individual functions and utilities in isolation.

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate } from './utils'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01')
    expect(formatDate(date)).toBe('January 1, 2024')
  })
})
```

### 2. Component Tests
Test React components with user interactions.

```typescript
// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Button } from './Button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    const { user } = render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 3. Integration Tests
Test feature modules with multiple components working together.

```typescript
// src/features/tasks/TaskList.integration.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import { TaskList } from './TaskList'
import { mockServer } from '@/test/mock-server'

describe('TaskList Integration', () => {
  it('should load and display tasks', async () => {
    mockServer.use(
      rest.get('/api/tasks', (req, res, ctx) => {
        return res(ctx.json([
          { id: 1, title: 'Test Task', completed: false }
        ]))
      })
    )

    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })
  })
})
```

### 4. E2E Tests
Test complete user workflows across the application.

```typescript
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test'

test('complete user signup flow', async ({ page }) => {
  await page.goto('/signup')
  
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'SecurePass123!')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('h1')).toContainText('Welcome')
})
```

## Running Tests

### Quick Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Run specific test types
bun test:unit
bun test:integration
bun test:e2e

# Run E2E tests with UI
bun test:e2e:headed

# Debug E2E tests
bun test:e2e:debug

# Run Storybook tests
bun test-storybook
```

### Test Configuration

Tests are configured in:
- `vitest.config.ts` - Unit and integration tests
- `playwright.config.ts` - E2E tests
- `.storybook/main.ts` - Storybook configuration

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Initialize test state
  })

  // Teardown
  afterEach(() => {
    // Clean up
  })

  // Group related tests
  describe('when condition is met', () => {
    it('should behave in expected way', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = functionUnderTest(input)
      
      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Using Test Utilities

The project includes custom test utilities in `src/test/test-utils.tsx`:

```typescript
import { render, screen, waitFor } from '@/test/test-utils'

// Custom render includes providers and user event setup
const { user } = render(<Component />)

// Interact with components
await user.click(screen.getByRole('button'))
await user.type(screen.getByLabelText('Email'), 'test@example.com')

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

## TDD Workflow

### 1. Red Phase - Write a Failing Test

```typescript
// Button.test.tsx
it('should be disabled when loading', () => {
  render(<Button loading>Click me</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

### 2. Green Phase - Make the Test Pass

```typescript
// Button.tsx
export function Button({ children, loading, ...props }) {
  return (
    <button disabled={loading} {...props}>
      {children}
    </button>
  )
}
```

### 3. Refactor Phase - Improve the Code

```typescript
// Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary'
}

export function Button({ 
  children, 
  loading, 
  variant = 'primary',
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={cn(
        'px-4 py-2 rounded',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        (loading || disabled) && 'opacity-50 cursor-not-allowed'
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

## Best Practices

### 1. Test Naming
- Use descriptive test names that explain the expected behavior
- Follow the pattern: "should [expected behavior] when [condition]"

### 2. Test Organization
- Group related tests using `describe` blocks
- Keep test files next to the code they test
- Use `.test.ts` for unit tests and `.integration.test.ts` for integration tests

### 3. Mocking
- Mock external dependencies (APIs, databases)
- Use `vi.mock()` for module mocking
- Keep mocks simple and focused

### 4. Assertions
- Use specific matchers (`toBeInTheDocument`, `toHaveBeenCalledWith`)
- Test behavior, not implementation details
- Verify one behavior per test

### 5. Performance
- Keep tests fast (< 100ms for unit tests)
- Use `test.concurrent` for independent tests
- Minimize setup/teardown overhead

### 6. Debugging
- Use `test.only` to run a single test
- Add `screen.debug()` to inspect DOM state
- Use Playwright's trace viewer for E2E debugging

## Coverage Requirements

The project enforces the following coverage thresholds:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

View coverage reports:
```bash
bun test:coverage
# Open coverage/index.html in browser
```

## CI/CD Integration

Tests run automatically on:
- Pull requests (all tests)
- Main branch commits (all tests + E2E)
- Pre-commit hooks (unit tests)
- Pre-push hooks (all tests)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Storybook Testing](https://storybook.js.org/docs/react/writing-tests/introduction)