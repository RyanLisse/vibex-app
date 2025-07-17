# Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when working with Zod schemas, form validation, API integration, and testing in the codex-clone project.

## Common Issues and Solutions

### 1. Zod Schema Validation Issues

#### Issue: Schema validation fails with cryptic error messages

**Problem**: Zod error messages are not user-friendly or don't provide enough context.

**Solution**:
```typescript
// Instead of this:
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Use this:
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})
```

**Advanced Solution** - Custom error formatting:
```typescript
import { z } from 'zod'

const formatZodError = (error: z.ZodError) => {
  return error.errors.reduce((acc, err) => {
    const path = err.path.join('.')
    acc[path] = err.message
    return acc
  }, {} as Record<string, string>)
}

const validateWithBetterErrors = (schema: z.ZodSchema, data: unknown) => {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodError(error),
        fieldErrors: error.flatten().fieldErrors
      }
    }
    return { success: false, errors: { general: 'Validation failed' } }
  }
}
```

#### Issue: Complex nested validation doesn't work as expected

**Problem**: Nested object validation fails or produces unexpected results.

**Solution**:
```typescript
// Problem: Shallow validation
const schema = z.object({
  user: z.object({
    profile: z.any() // This doesn't validate nested structure
  })
})

// Solution: Deep validation
const schema = z.object({
  user: z.object({
    profile: z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'auto']).default('auto'),
        notifications: z.boolean().default(true)
      }).default({})
    })
  })
})
```

**Debug tip**: Use `.passthrough()` to see what data is being processed:
```typescript
const debugSchema = schema.passthrough()
const result = debugSchema.safeParse(data)
console.log('Parsed data:', result.success ? result.data : result.error)
```

#### Issue: Schema refinement doesn't work correctly

**Problem**: Custom validation using `.refine()` doesn't behave as expected.

**Solution**:
```typescript
// Problem: Incorrect refinement
const schema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, 'Passwords must match')

// Solution: Proper refinement with path
const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'], // This targets the specific field
})
```

### 2. useZodForm Hook Issues

#### Issue: Form validation doesn't trigger when expected

**Problem**: Validation only happens on submit, not on field changes.

**Solution**:
```typescript
// Enable validation on change
const form = useZodForm({
  schema: mySchema,
  validateOnChange: true, // This enables real-time validation
  mode: 'onChange', // This is passed to react-hook-form
})
```

#### Issue: Async validation doesn't work properly

**Problem**: Async validation fails or doesn't provide feedback.

**Solution**:
```typescript
// Proper async validation setup
const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
}).refine(async (data) => {
  try {
    const response = await fetch(`/api/check-username/${data.username}`)
    const result = await response.json()
    return result.available
  } catch (error) {
    return false
  }
}, 'Username is not available')

// Use with async parsing
const form = useZodForm({
  schema,
  validateOnChange: false, // Disable real-time for async
})

// Manual async validation
const handleUsernameBlur = async () => {
  const username = form.getValues('username')
  const isValid = await form.validateFieldAsync('username', username)
  if (!isValid) {
    form.setFieldError('username', 'Username is not available')
  }
}
```

#### Issue: Form persistence doesn't work

**Problem**: Form data is not saved to or loaded from localStorage.

**Solution**:
```typescript
// Check localStorage availability
const isStorageAvailable = () => {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

// Enhanced persistence with error handling
const form = useZodForm({
  schema: mySchema,
})

const saveFormData = useCallback(() => {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available')
    return
  }
  
  try {
    const data = form.getValues()
    localStorage.setItem('form-data', JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save form data:', error)
  }
}, [form])

// Auto-save with debouncing
useEffect(() => {
  const subscription = form.watch(debounce(saveFormData, 1000))
  return () => subscription.unsubscribe()
}, [form, saveFormData])
```

### 3. API Integration Issues

#### Issue: API route validation fails with valid data

**Problem**: Data that should be valid is rejected by API route schemas.

**Solution**:
```typescript
// Debug API validation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received data:', body) // Debug log
    
    const validation = CreateTaskSchema.safeParse(body)
    
    if (!validation.success) {
      console.log('Validation errors:', validation.error.errors) // Debug log
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }
    
    // Continue with valid data
    return NextResponse.json({ success: true, data: validation.data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Issue: Date validation fails in API routes

**Problem**: Date strings are not properly validated or parsed.

**Solution**:
```typescript
// Problem: Basic date validation
const schema = z.object({
  dueDate: z.date(), // This expects a Date object, not string
})

// Solution: Proper date string validation
const schema = z.object({
  dueDate: z.string().datetime('Invalid date format').optional(),
})

// Or with transformation
const schema = z.object({
  dueDate: z.string().transform((str) => new Date(str)).optional(),
})

// With validation
const schema = z.object({
  dueDate: z.string()
    .datetime('Invalid date format')
    .refine((date) => new Date(date) > new Date(), 'Date must be in the future')
    .optional(),
})
```

### 4. Testing Issues

#### Issue: Schema tests fail intermittently

**Problem**: Tests pass sometimes and fail other times.

**Solution**:
```typescript
// Problem: Non-deterministic test data
it('should validate user data', () => {
  const userData = {
    id: Math.random().toString(), // This changes each run
    createdAt: new Date().toISOString(), // This changes each run
  }
  
  const result = schema.safeParse(userData)
  expect(result.success).toBe(true)
})

// Solution: Deterministic test data
const createTestUser = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  ...overrides,
})

it('should validate user data', () => {
  const userData = createTestUser()
  const result = schema.safeParse(userData)
  expect(result.success).toBe(true)
})
```

#### Issue: Async tests timeout or fail

**Problem**: Tests involving async validation timeout or fail unexpectedly.

**Solution**:
```typescript
// Problem: No timeout handling
it('should validate async field', async () => {
  const result = await schema.safeParseAsync(data)
  expect(result.success).toBe(true)
})

// Solution: Proper timeout and error handling
it('should validate async field', async () => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 5000)
  })
  
  const validationPromise = schema.safeParseAsync(data)
  
  try {
    const result = await Promise.race([validationPromise, timeoutPromise])
    expect(result.success).toBe(true)
  } catch (error) {
    if (error.message === 'Timeout') {
      throw new Error('Async validation timed out')
    }
    throw error
  }
}, 10000) // 10 second timeout
```

#### Issue: Mock Service Worker (MSW) doesn't work in tests

**Problem**: API mocking doesn't work, causing tests to fail.

**Solution**:
```typescript
// Ensure MSW is properly set up
// tests/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Check handler configuration
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/tasks', async ({ request }) => {
    const data = await request.json()
    
    // Add logging for debugging
    console.log('MSW intercepted request:', data)
    
    return HttpResponse.json({
      success: true,
      data: { id: '1', ...data },
    })
  }),
]
```

### 5. Performance Issues

#### Issue: Schema validation is slow

**Problem**: Large datasets or complex schemas cause performance issues.

**Solution**:
```typescript
// Problem: Synchronous validation of large datasets
const validateLargeDataset = (items: any[]) => {
  return items.map(item => schema.parse(item)) // Blocks the main thread
}

// Solution: Chunked validation
const validateLargeDatasetChunked = async (items: any[], chunkSize = 100) => {
  const chunks = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  
  const results = []
  for (const chunk of chunks) {
    const chunkResults = chunk.map(item => schema.safeParse(item))
    results.push(...chunkResults)
    
    // Allow other tasks to run
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  
  return results
}

// Or use web workers for heavy validation
// validation-worker.ts
self.onmessage = function(e) {
  const { schema, data } = e.data
  const result = schema.safeParse(data)
  self.postMessage(result)
}
```

#### Issue: Form validation causes UI lag

**Problem**: Real-time validation causes input lag.

**Solution**:
```typescript
// Problem: Validation on every keystroke
const form = useZodForm({
  schema: complexSchema,
  validateOnChange: true, // This validates on every change
})

// Solution: Debounced validation
import { useDebouncedCallback } from 'use-debounce'

const form = useZodForm({
  schema: complexSchema,
  validateOnChange: false, // Disable automatic validation
})

const debouncedValidate = useDebouncedCallback(
  async (fieldName: string, value: any) => {
    const isValid = await form.validateField(fieldName)
    // Handle validation result
  },
  300 // 300ms delay
)

// Use in input handlers
const handleInputChange = (fieldName: string, value: any) => {
  form.setValue(fieldName, value)
  debouncedValidate(fieldName, value)
}
```

### 6. TypeScript Issues

#### Issue: Type errors with inferred Zod types

**Problem**: TypeScript can't infer types correctly from Zod schemas.

**Solution**:
```typescript
// Problem: Type inference fails
const schema = z.object({
  data: z.record(z.any()), // This loses type information
})

// Solution: Better type definitions
const schema = z.object({
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

// Or use explicit typing
interface UserData {
  id: string
  email: string
  profile: {
    firstName: string
    lastName: string
  }
}

const schema: z.ZodSchema<UserData> = z.object({
  id: z.string(),
  email: z.string().email(),
  profile: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }),
})
```

#### Issue: Generic type constraints don't work

**Problem**: Generic types with Zod schemas cause TypeScript errors.

**Solution**:
```typescript
// Problem: Generic constraint issues
function createFormHook<T>(schema: z.ZodSchema<T>) {
  return useZodForm({ schema })
}

// Solution: Proper generic constraints
function createFormHook<T extends Record<string, any>>(
  schema: z.ZodSchema<T>
): UseZodFormReturn<T> {
  return useZodForm({ schema })
}

// Or use utility types
type InferredType<T> = T extends z.ZodSchema<infer U> ? U : never

function createFormHook<T extends z.ZodSchema<any>>(
  schema: T
): UseZodFormReturn<InferredType<T>> {
  return useZodForm({ schema })
}
```

### 7. Environment and Build Issues

#### Issue: Zod imports fail in production

**Problem**: Zod imports work in development but fail in production builds.

**Solution**:
```typescript
// Check package.json for proper Zod version
{
  "dependencies": {
    "zod": "^3.22.4" // Ensure compatible version
  }
}

// Check for proper import statements
// Problem: Wrong import
import zod from 'zod' // This might not work

// Solution: Correct import
import { z } from 'zod'

// Check build configuration
// next.config.js
module.exports = {
  transpilePackages: ['zod'], // If needed
  experimental: {
    esmExternals: true,
  },
}
```

#### Issue: Bundle size is too large

**Problem**: Including Zod significantly increases bundle size.

**Solution**:
```typescript
// Use tree shaking
// Instead of importing everything:
import { z } from 'zod'

// Import only what you need (if supported):
import { ZodObject, ZodString, ZodNumber } from 'zod'

// Check webpack-bundle-analyzer output
npm run analyze

// Consider code splitting for large schemas
const UserSchema = lazy(() => import('./schemas/user'))
```

## Debugging Tools and Techniques

### 1. Schema Debugging

```typescript
// Debug schema structure
const debugSchema = (schema: z.ZodSchema, data: unknown) => {
  console.log('Schema type:', schema._def.typeName)
  console.log('Input data:', data)
  
  const result = schema.safeParse(data)
  
  if (!result.success) {
    console.log('Validation errors:', result.error.errors)
    console.log('Formatted errors:', result.error.flatten())
  } else {
    console.log('Parsed data:', result.data)
  }
  
  return result
}
```

### 2. Form State Debugging

```typescript
// Debug form state
const DebugForm = () => {
  const form = useZodForm({ schema: mySchema })
  
  useEffect(() => {
    const subscription = form.watch((values) => {
      console.log('Form values:', values)
      console.log('Form errors:', form.formState.errors)
      console.log('Form state:', {
        isValid: form.formState.isValid,
        isDirty: form.formState.isDirty,
        isSubmitting: form.formState.isSubmitting,
      })
    })
    
    return () => subscription.unsubscribe()
  }, [form])
  
  return (
    <div>
      <pre>{JSON.stringify(form.getValues(), null, 2)}</pre>
      <pre>{JSON.stringify(form.formState.errors, null, 2)}</pre>
    </div>
  )
}
```

### 3. API Debugging

```typescript
// Debug API requests
const debugApiCall = async (url: string, data: any) => {
  console.log('API Request:', { url, data })
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    const result = await response.json()
    console.log('API Response:', { status: response.status, data: result })
    
    return result
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}
```

## Getting Help

### 1. Common Resources

- **Zod Documentation**: https://zod.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Vitest Documentation**: https://vitest.dev/
- **Playwright Documentation**: https://playwright.dev/

### 2. Community Support

- **Stack Overflow**: Tag questions with `zod`, `react-hook-form`, `typescript`
- **GitHub Issues**: Check existing issues in respective repositories
- **Discord Communities**: React, TypeScript, and Next.js communities

### 3. Project-Specific Help

- **Check existing tests**: Look at `tests/` directory for examples
- **Review schema examples**: Check `src/schemas/` for patterns
- **Examine form components**: Look at `components/forms/` for usage patterns

## Prevention Strategies

### 1. Code Quality

- Use ESLint rules for consistent code style
- Implement pre-commit hooks for validation
- Regular code reviews focusing on schema design
- Automated testing for all schema changes

### 2. Documentation

- Document schema intentions and business rules
- Maintain up-to-date API documentation
- Keep troubleshooting guide current
- Regular team knowledge sharing sessions

### 3. Monitoring

- Log validation failures in production
- Monitor form submission success rates
- Track API error rates
- Set up alerts for validation issues

By following this troubleshooting guide, you should be able to quickly identify and resolve most issues related to Zod schemas, form validation, and testing in the codex-clone project.