# Bun Testing Guide

This guide explains how to use Bun's built-in test runner for unit tests with React Testing Library support.

## Overview

Bun provides a fast, built-in test runner that supports TypeScript, JSX, and React Testing Library out of the box. This setup provides an alternative to Vitest for running unit tests with better performance and simpler configuration.

## Configuration Files

### `bunfig.toml`
The main configuration file for Bun, including test settings:

```toml
[test]
jsx = "react-jsx"
jsxImportSource = "react"
environment = "jsdom"
timeout = 10000
setup = ["./bun-test-setup.ts"]
coverage = true
coverageDir = "./coverage"
coverageReporter = ["text", "html", "lcov"]
coverageThreshold = 80
```

### `bun-test-setup.ts`
Global test setup file that configures:
- DOM polyfills (IntersectionObserver, ResizeObserver, matchMedia)
- Next.js mocks (router, navigation, components)
- React Testing Library cleanup
- Environment variable management
- Browser API mocks

## Available Commands

```bash
# Run all tests
bun run test:bun

# Run tests in watch mode
bun run test:bun:watch

# Run tests with coverage
bun run test:bun:coverage

# Run only unit tests
bun run test:bun:unit

# Run only integration tests
bun run test:bun:integration
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  beforeEach(() => {
    // Clean up DOM before each test
    document.body.innerHTML = ''
  })

  it('should render correctly', () => {
    render(<MyComponent title="Test" />)
    
    const title = screen.getByText('Test')
    expect(title).toBeTruthy()
  })
})
```

### Using Custom Test Utilities

```typescript
import { renderWithProviders, createMockComponent } from '@/tests/bun-test-utils'

// Custom render with providers
const { container } = renderWithProviders(<MyComponent />)

// Create mock components
const MockButton = createMockComponent('Button', { variant: 'primary' })
```

### Testing Hooks

```typescript
import { renderHook } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

it('should handle hook state', () => {
  const { result } = renderHook(() => useMyHook())
  
  expect(result.current.value).toBe('initial')
})
```

### Testing with Next.js Features

```typescript
// Next.js router is automatically mocked
import { useRouter } from 'next/navigation'

it('should use router', () => {
  const router = useRouter()
  router.push('/new-page')
  
  // Router push is mocked and can be tested
  expect(router.push).toHaveBeenCalledWith('/new-page')
})
```

## Available Mocks

### Browser APIs
- `IntersectionObserver`
- `ResizeObserver`
- `window.matchMedia`
- `localStorage` / `sessionStorage`
- `AudioContext` and `MediaRecorder`
- `navigator.mediaDevices`

### Next.js Components
- `next/navigation` (useRouter, usePathname, useSearchParams)
- `next/router` (legacy router)
- `next/image` (Image component)
- `next/link` (Link component)
- `next/head` (Head component)

### Third-party Libraries
- `next-themes` (useTheme)
- `framer-motion` (motion components)
- `@tanstack/react-query` (useQuery, useMutation)
- `zustand` (store creation)
- `lucide-react` (icons)

## Custom Matchers

The setup includes custom matchers for better testing experience:

```typescript
expect(element).toBeInTheDocument()
expect(element).toHaveTextContent('Hello')
expect(element).toHaveClass('active')
expect(element).toBeVisible()
expect(element).toHaveAttribute('data-testid', 'button')
```

## Testing Patterns

### Component Testing

```typescript
describe('Button Component', () => {
  it('should handle click events', () => {
    let clicked = false
    const handleClick = () => { clicked = true }
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button')
    button.click()
    
    expect(clicked).toBe(true)
  })
})
```

### Form Testing

```typescript
import { fillInput, selectOption, checkCheckbox } from '@/tests/bun-test-utils'

describe('Form Component', () => {
  it('should handle form submission', () => {
    render(<MyForm onSubmit={handleSubmit} />)
    
    const nameInput = screen.getByLabelText('Name')
    const submitButton = screen.getByRole('button', { name: 'Submit' })
    
    fillInput(nameInput, 'John Doe')
    submitButton.click()
    
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'John Doe'
    })
  })
})
```

### Async Testing

```typescript
import { waitFor, flushPromises } from '@/tests/bun-test-utils'

describe('Async Operations', () => {
  it('should handle async state updates', async () => {
    render(<AsyncComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Loaded')).toBeInTheDocument()
    })
  })
})
```

### Mock API Testing

```typescript
import { createMockApiResponse } from '@/tests/bun-test-utils'

describe('API Integration', () => {
  it('should handle API responses', async () => {
    const mockResponse = createMockApiResponse(
      { data: 'test' },
      { status: 200 }
    )
    
    // Mock fetch
    globalThis.fetch = async () => mockResponse
    
    // Test component that uses fetch
    render(<ApiComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument()
    })
  })
})
```

## Environment Setup

The test environment is configured with:

- `NODE_ENV=test`
- JSDOM for DOM simulation
- React Testing Library for component testing
- Comprehensive mocking for Next.js and browser APIs
- Path alias resolution for `@/` imports

## Performance Benefits

Bun's test runner provides several performance advantages:

1. **Faster startup** - No need to compile TypeScript separately
2. **Built-in JSX support** - No additional configuration needed
3. **Concurrent execution** - Tests run in parallel by default
4. **Memory efficiency** - Better memory management than Node.js
5. **Native coverage** - Built-in coverage reporting

## Migration from Vitest

If migrating from Vitest:

1. Replace `vitest` imports with `bun:test`
2. Update test scripts to use `bun test`
3. Keep existing React Testing Library code
4. Update configuration from `vitest.config.ts` to `bunfig.toml`

## Troubleshooting

### Common Issues

1. **Path aliases not working**: Ensure `bunfig.toml` has correct alias configuration
2. **JSX not compiling**: Check `jsx` and `jsxImportSource` settings
3. **Mocks not working**: Verify `bun-test-setup.ts` is in the setup array
4. **Coverage not generating**: Ensure `coverage = true` in `bunfig.toml`

### Debug Mode

Run tests with debug information:

```bash
BUN_DEBUG=1 bun test
```

### Verbose Output

Get detailed test output:

```bash
bun test --verbose
```

## Best Practices

1. **Use descriptive test names** - Clearly describe what the test does
2. **Clean up after tests** - Use `beforeEach` and `afterEach` hooks
3. **Mock external dependencies** - Keep tests isolated and fast
4. **Test user interactions** - Focus on how users interact with components
5. **Use custom matchers** - Leverage the extended matchers for better assertions
6. **Group related tests** - Use `describe` blocks to organize tests
7. **Test edge cases** - Include tests for error states and boundary conditions

## Coverage Reports

Coverage reports are generated in multiple formats:
- Terminal output (text)
- HTML report (`./coverage/index.html`)
- LCOV format for CI integration

Open the HTML report to see detailed coverage information:

```bash
open coverage/index.html
```

## CI Integration

For CI/CD pipelines, use:

```bash
bun test --coverage --reporter=lcov
```

This generates LCOV coverage reports that can be consumed by various CI tools and coverage services.