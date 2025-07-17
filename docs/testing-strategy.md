# Testing Strategy Guide

## Overview

This document outlines a comprehensive testing strategy for the codex-clone project, focusing on schema validation, form handling, API integration, and end-to-end workflows. The strategy emphasizes automated testing, continuous integration, and maintainable test patterns.

## Testing Pyramid

### 1. Unit Tests (60% of tests)
- **Schema validation tests**
- **Hook behavior tests**
- **Utility function tests**
- **Component logic tests**

### 2. Integration Tests (30% of tests)
- **API route tests**
- **Form submission workflows**
- **Database interaction tests**
- **External service integration**

### 3. End-to-End Tests (10% of tests)
- **User journey tests**
- **Cross-browser compatibility**
- **Performance testing**
- **Visual regression tests**

## Test Types and Implementation

### Unit Tests

#### Schema Validation Tests

```typescript
// tests/unit/schemas/forms.test.ts
import { describe, it, expect } from 'vitest'
import { userRegistrationSchema, contactFormSchema } from '@/schemas/forms'

describe('Schema Validation', () => {
  describe('userRegistrationSchema', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      age: 25,
      terms: true,
    }

    it('should validate correct user data', () => {
      const result = userRegistrationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject password mismatch', () => {
      const result = userRegistrationSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPassword123',
      })
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['confirmPassword'],
            message: "Passwords don't match"
          })
        )
      }
    })

    it('should validate email format', () => {
      const invalidEmails = ['invalid', 'test@', '@example.com']
      
      invalidEmails.forEach(email => {
        const result = userRegistrationSchema.safeParse({
          ...validData,
          email
        })
        expect(result.success).toBe(false)
      })
    })

    it('should validate password complexity', () => {
      const weakPasswords = ['weak', 'password123', 'PASSWORD123', '12345678']
      
      weakPasswords.forEach(password => {
        const result = userRegistrationSchema.safeParse({
          ...validData,
          password,
          confirmPassword: password
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('contactFormSchema', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Test Subject',
      message: 'This is a test message with sufficient length.',
      priority: 'medium' as const,
    }

    it('should validate priority enum', () => {
      const validPriorities = ['low', 'medium', 'high']
      
      validPriorities.forEach(priority => {
        const result = contactFormSchema.safeParse({
          ...validData,
          priority
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid priority', () => {
      const result = contactFormSchema.safeParse({
        ...validData,
        priority: 'invalid'
      })
      expect(result.success).toBe(false)
    })

    it('should validate message length', () => {
      const shortMessage = 'Short'
      const result = contactFormSchema.safeParse({
        ...validData,
        message: shortMessage
      })
      expect(result.success).toBe(false)
    })
  })
})
```

#### Hook Tests

```typescript
// tests/unit/hooks/useZodForm.test.ts
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'

const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be at least 18'),
})

describe('useZodForm Hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        defaultValues: {
          name: '',
          email: '',
          age: 0,
        },
      })
    )

    expect(result.current.getValues()).toEqual({
      name: '',
      email: '',
      age: 0,
    })
  })

  it('should validate fields on change', async () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        validateOnChange: true,
      })
    )

    await act(async () => {
      result.current.setValue('email', 'invalid-email')
    })

    expect(result.current.hasFieldError('email')).toBe(true)
    expect(result.current.getFieldError('email')).toBe('Invalid email')
  })

  it('should handle form submission', async () => {
    const mockSubmit = vi.fn()
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockSubmit,
      })
    )

    await act(async () => {
      result.current.setValue('name', 'John Doe')
      result.current.setValue('email', 'john@example.com')
      result.current.setValue('age', 25)
    })

    await act(async () => {
      await result.current.submitForm()
    })

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
    })
  })

  it('should handle validation errors', async () => {
    const mockError = vi.fn()
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onError: mockError,
      })
    )

    await act(async () => {
      result.current.setValue('name', 'A') // Too short
      result.current.setValue('email', 'invalid')
      result.current.setValue('age', 16) // Too young
    })

    await act(async () => {
      await result.current.submitForm()
    })

    expect(mockError).toHaveBeenCalledWith({
      name: 'Name must be at least 2 characters',
      email: 'Invalid email',
      age: 'Must be at least 18',
    })
  })

  it('should support async validation', async () => {
    const asyncSchema = testSchema.extend({
      username: z.string().refine(async (val) => {
        // Simulate async validation
        await new Promise(resolve => setTimeout(resolve, 100))
        return val !== 'taken'
      }, 'Username is taken'),
    })

    const { result } = renderHook(() =>
      useZodForm({
        schema: asyncSchema,
      })
    )

    await act(async () => {
      result.current.setValue('username', 'taken')
    })

    const isValid = await result.current.validateField('username')
    expect(isValid).toBe(false)
  })

  it('should support form persistence', () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
      })
    )

    const testData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
    }

    act(() => {
      result.current.setValue('name', testData.name)
      result.current.setValue('email', testData.email)
      result.current.setValue('age', testData.age)
    })

    act(() => {
      result.current.saveToStorage('test-form')
    })

    // Reset form
    act(() => {
      result.current.reset()
    })

    // Load from storage
    act(() => {
      result.current.loadFromStorage('test-form')
    })

    expect(result.current.getValues()).toEqual(testData)
  })
})
```

### Integration Tests

#### API Route Tests

```typescript
// tests/integration/api/tasks.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { POST, GET, PUT, DELETE } from '@/app/api/tasks/route'
import { TaskSchema, CreateTaskSchema } from '@/schemas/api-routes'

describe('/api/tasks', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const validTaskData = {
        title: 'Test Task',
        description: 'A test task description',
        priority: 'high',
        tags: ['test', 'api'],
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: validTaskData,
      })

      await POST(req)

      expect(res._getStatusCode()).toBe(201)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data).toMatchObject(validTaskData)
      expect(responseData.data.id).toBeDefined()
    })

    it('should reject invalid task data', async () => {
      const invalidTaskData = {
        title: '', // Empty title
        priority: 'invalid', // Invalid priority
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidTaskData,
      })

      await POST(req)

      expect(res._getStatusCode()).toBe(400)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(false)
      expect(responseData.validationErrors).toBeDefined()
    })

    it('should validate schema compliance', async () => {
      const taskData = {
        title: 'Valid Task',
        description: 'Description',
        priority: 'medium',
      }

      const validationResult = CreateTaskSchema.safeParse(taskData)
      expect(validationResult.success).toBe(true)
    })
  })

  describe('GET /api/tasks', () => {
    it('should return paginated tasks', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          page: '1',
          limit: '10',
          status: 'pending',
        },
      })

      await GET(req)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data).toBeInstanceOf(Array)
      expect(responseData.pagination).toBeDefined()
      expect(responseData.pagination.page).toBe(1)
      expect(responseData.pagination.limit).toBe(10)
    })

    it('should filter tasks by status', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'completed' },
      })

      await GET(req)

      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      
      responseData.data.forEach(task => {
        expect(task.status).toBe('completed')
      })
    })
  })
})
```

#### Form Integration Tests

```typescript
// tests/integration/forms/contact-form.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '@/components/forms/contact-form'
import { server } from '@/tests/mocks/server'
import { http, HttpResponse } from 'msw'

describe('ContactForm Integration', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    
    render(<ContactForm />)

    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/subject/i), 'Test Subject')
    await user.type(screen.getByLabelText(/message/i), 'This is a test message with sufficient length.')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high')

    // Submit form
    await user.click(screen.getByRole('button', { name: /submit/i }))

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument()
    })
  })

  it('should show validation errors for invalid data', async () => {
    const user = userEvent.setup()
    
    render(<ContactForm />)

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /submit/i }))

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      expect(screen.getByText(/subject must be at least 5 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    server.use(
      http.post('/api/contact', () => {
        return HttpResponse.json(
          { success: false, error: 'Server error' },
          { status: 500 }
        )
      })
    )

    const user = userEvent.setup()
    
    render(<ContactForm />)

    // Fill and submit form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/subject/i), 'Test Subject')
    await user.type(screen.getByLabelText(/message/i), 'This is a test message.')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'medium')

    await user.click(screen.getByRole('button', { name: /submit/i }))

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
    })
  })

  it('should persist form data in localStorage', async () => {
    const user = userEvent.setup()
    
    render(<ContactForm />)

    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')

    // Verify data is saved to localStorage
    await waitFor(() => {
      const savedData = localStorage.getItem('contact-form')
      expect(savedData).toContain('John Doe')
      expect(savedData).toContain('john@example.com')
    })
  })
})
```

### End-to-End Tests

#### User Journey Tests

```typescript
// tests/e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test'

test.describe('User Registration Flow', () => {
  test('should complete full registration process', async ({ page }) => {
    await page.goto('/register')

    // Fill registration form
    await page.fill('[data-testid="first-name"]', 'John')
    await page.fill('[data-testid="last-name"]', 'Doe')
    await page.fill('[data-testid="email"]', 'john.doe@example.com')
    await page.fill('[data-testid="password"]', 'SecurePassword123')
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123')
    await page.fill('[data-testid="age"]', '25')
    await page.check('[data-testid="terms"]')

    // Submit form
    await page.click('[data-testid="submit-button"]')

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should show validation errors for invalid data', async ({ page }) => {
    await page.goto('/register')

    // Fill with invalid data
    await page.fill('[data-testid="email"]', 'invalid-email')
    await page.fill('[data-testid="password"]', 'weak')
    await page.fill('[data-testid="confirm-password"]', 'different')

    // Submit form
    await page.click('[data-testid="submit-button"]')

    // Check for validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('8 characters')
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('match')
  })

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock server error
    await page.route('/api/register', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

    await page.goto('/register')

    // Fill valid data
    await page.fill('[data-testid="first-name"]', 'John')
    await page.fill('[data-testid="last-name"]', 'Doe')
    await page.fill('[data-testid="email"]', 'john@example.com')
    await page.fill('[data-testid="password"]', 'SecurePassword123')
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123')
    await page.fill('[data-testid="age"]', '25')
    await page.check('[data-testid="terms"]')

    await page.click('[data-testid="submit-button"]')

    // Check for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })
})
```

#### Cross-Browser Testing

```typescript
// tests/e2e/cross-browser.spec.ts
import { test, expect, devices } from '@playwright/test'

const browsers = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'Mobile Chrome', ...devices['Pixel 5'] },
  { name: 'Mobile Safari', ...devices['iPhone 12'] },
]

browsers.forEach(({ name, ...device }) => {
  test.describe(`${name} - Form Validation`, () => {
    test.use({ ...device })

    test('should validate forms consistently', async ({ page }) => {
      await page.goto('/contact')

      // Test form validation
      await page.click('[data-testid="submit-button"]')

      // Check validation errors appear
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="message-error"]')).toBeVisible()
    })
  })
})
```

## Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup

```typescript
// vitest.setup.ts
import { expect, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

beforeEach(() => {
  cleanup()
  // Clear localStorage
  localStorage.clear()
  // Clear sessionStorage
  sessionStorage.clear()
  // Clear all mocks
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

### MSW (Mock Service Worker) Setup

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/contact', async ({ request }) => {
    const data = await request.json()
    
    // Simulate validation
    if (!data.name || !data.email || !data.message) {
      return HttpResponse.json(
        { success: false, error: 'Validation failed' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      message: 'Message sent successfully',
    })
  }),

  http.post('/api/register', async ({ request }) => {
    const data = await request.json()
    
    return HttpResponse.json({
      success: true,
      data: {
        id: '123',
        ...data,
      },
    })
  }),

  http.get('/api/tasks', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'completed' },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    })
  }),
]
```

## Testing Best Practices

### 1. Test Organization

```
tests/
├── unit/
│   ├── schemas/
│   ├── hooks/
│   ├── components/
│   └── utils/
├── integration/
│   ├── api/
│   ├── forms/
│   └── workflows/
├── e2e/
│   ├── user-journeys/
│   ├── cross-browser/
│   └── performance/
├── mocks/
│   ├── handlers.ts
│   ├── server.ts
│   └── data/
└── fixtures/
    ├── schemas.ts
    ├── users.ts
    └── tasks.ts
```

### 2. Test Naming Conventions

```typescript
// Describe blocks: Feature/Component name
describe('UserRegistrationSchema', () => {
  // Context blocks: Specific scenario
  describe('when validating email field', () => {
    // Test cases: Expected behavior
    it('should accept valid email formats', () => {})
    it('should reject invalid email formats', () => {})
  })
})
```

### 3. Test Data Management

```typescript
// tests/fixtures/schemas.ts
export const createValidUserData = (overrides = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'SecurePassword123',
  confirmPassword: 'SecurePassword123',
  age: 25,
  terms: true,
  ...overrides,
})

export const createInvalidUserData = (field: string, value: any) => ({
  ...createValidUserData(),
  [field]: value,
})
```

### 4. Assertion Patterns

```typescript
// Success assertions
expect(result.success).toBe(true)
if (result.success) {
  expect(result.data).toEqual(expectedData)
}

// Error assertions
expect(result.success).toBe(false)
if (!result.success) {
  expect(result.error.errors).toContainEqual(
    expect.objectContaining({
      path: ['fieldName'],
      message: 'Expected error message'
    })
  )
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Testing

### Load Testing for Schemas

```typescript
// tests/performance/schema-validation.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { UserProfileSchema } from '@/schemas/complex-examples'

describe('Schema Performance', () => {
  it('should validate large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      username: `user${i}`,
      profile: {
        firstName: `User${i}`,
        lastName: 'Test',
      },
    }))

    const start = performance.now()
    const results = largeDataset.map(item => 
      UserProfileSchema.safeParse(item)
    )
    const end = performance.now()

    expect(end - start).toBeLessThan(1000) // Should complete in under 1 second
    expect(results.every(r => r.success)).toBe(true)
  })

  it('should handle concurrent validation', async () => {
    const testData = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'testuser',
      profile: {
        firstName: 'Test',
        lastName: 'User',
      },
    }

    const start = performance.now()
    const promises = Array.from({ length: 100 }, () =>
      Promise.resolve(UserProfileSchema.safeParse(testData))
    )
    const results = await Promise.all(promises)
    const end = performance.now()

    expect(end - start).toBeLessThan(500) // Should complete in under 500ms
    expect(results.every(r => r.success)).toBe(true)
  })
})
```

## Quality Gates

### Coverage Requirements

```json
{
  "coverage": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "perFile": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

### Test Quality Metrics

- **Test Coverage**: Minimum 80% code coverage
- **Test Performance**: Unit tests < 5s, Integration tests < 30s
- **Test Reliability**: <1% flaky test rate
- **Test Maintainability**: Clear test descriptions and DRY principles

## Conclusion

This comprehensive testing strategy ensures:

1. **Robust validation** through extensive schema testing
2. **Reliable integration** through API and form testing
3. **User-focused quality** through E2E testing
4. **Continuous quality** through automated CI/CD
5. **Performance assurance** through load testing
6. **Maintainable tests** through clear organization and patterns

By following this strategy, the codex-clone project maintains high code quality, prevents regressions, and provides confidence in deployments.