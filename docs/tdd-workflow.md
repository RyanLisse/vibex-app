# TDD Workflow with Zod Schemas

## Overview

This document outlines the Test-Driven Development (TDD) workflow for implementing Zod schemas in the codex-clone project. The workflow emphasizes writing tests first, then implementing the schemas, and finally integrating them into the application.

## TDD Cycle for Zod Schemas

### 1. Red Phase - Write Failing Tests

Start by writing tests that define the expected behavior of your schemas.

```typescript
// Example: tests/schemas/user-profile.test.ts
import { describe, it, expect } from 'vitest'
import { UserProfileSchema } from '@/schemas/user-profile'

describe('UserProfileSchema', () => {
  it('should validate a complete user profile', () => {
    const validProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      username: 'johndoe',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer passionate about clean code',
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: { enabled: true, frequency: 'daily' }
        }
      }
    }

    const result = UserProfileSchema.safeParse(validProfile)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email format', () => {
    const invalidProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'invalid-email',
      username: 'johndoe',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      }
    }

    const result = UserProfileSchema.safeParse(invalidProfile)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          path: ['email'],
          message: 'Invalid email'
        })
      )
    }
  })
})
```

### 2. Green Phase - Implement Schema

Create the minimal schema implementation to make tests pass.

```typescript
// src/schemas/user-profile.ts
import { z } from 'zod'

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  profile: z.object({
    firstName: z.string(),
    lastName: z.string(),
    bio: z.string().optional(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    notifications: z.object({
      email: z.object({
        enabled: z.boolean().default(true),
        frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
      })
    })
  }).default({})
})
```

### 3. Refactor Phase - Improve Implementation

Enhance the schema with better validation, error messages, and organization.

```typescript
// Enhanced version with better validation
export const UserProfileSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Please enter a valid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  profile: z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    notifications: z.object({
      email: z.object({
        enabled: z.boolean().default(true),
        frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
      }).default({})
    }).default({})
  }).default({})
})
```

## TDD Workflow Steps

### Step 1: Define Requirements Through Tests

Before writing any schema code, define what you expect through comprehensive tests:

```typescript
describe('TaskSchema Requirements', () => {
  describe('Basic validation', () => {
    it('should require title field')
    it('should limit title to 200 characters')
    it('should allow optional description')
    it('should validate status enum values')
    it('should validate priority enum values')
    it('should default status to pending')
  })

  describe('Complex validation', () => {
    it('should validate due date is in the future')
    it('should validate tags are unique')
    it('should validate assignee exists in system')
    it('should validate metadata structure')
  })

  describe('Business rules', () => {
    it('should not allow completed tasks to change status')
    it('should require due date for high priority tasks')
    it('should validate task dependencies')
  })
})
```

### Step 2: Implement Schema Incrementally

Start with the most basic implementation and add complexity gradually:

```typescript
// Phase 1: Basic structure
export const TaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
})

// Phase 2: Add validation rules
export const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
})

// Phase 3: Add complex business rules
export const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  assigneeId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => {
  // Business rule: High priority tasks must have due date
  if (data.priority === 'high' && !data.dueDate) {
    return false
  }
  return true
}, {
  message: 'High priority tasks must have a due date',
  path: ['dueDate']
})
```

### Step 3: Integration Testing

Test schema integration with forms and API endpoints:

```typescript
// Integration tests
describe('TaskSchema Integration', () => {
  it('should integrate with useZodForm hook', () => {
    const { result } = renderHook(() => 
      useZodForm({
        schema: TaskSchema,
        defaultValues: {
          title: '',
          priority: 'medium',
          status: 'pending'
        }
      })
    )

    expect(result.current.formState.isValid).toBe(false)
    
    act(() => {
      result.current.setValue('title', 'Test Task')
    })

    expect(result.current.formState.isValid).toBe(true)
  })

  it('should validate API request data', () => {
    const requestData = {
      title: 'New Task',
      description: 'Task description',
      priority: 'high',
      dueDate: '2024-12-31T23:59:59Z'
    }

    const result = validateApiRequest(TaskSchema, requestData)
    expect(result.success).toBe(true)
  })
})
```

## Best Practices for TDD with Zod

### 1. Test Structure

Organize tests by validation concern:

```typescript
describe('SchemaName', () => {
  describe('Field validation', () => {
    // Test individual field validation
  })

  describe('Cross-field validation', () => {
    // Test relationships between fields
  })

  describe('Business rules', () => {
    // Test business logic validation
  })

  describe('Edge cases', () => {
    // Test boundary conditions
  })

  describe('Integration', () => {
    // Test with forms, APIs, etc.
  })
})
```

### 2. Test Data Management

Use factories for consistent test data:

```typescript
// test-factories.ts
export const createValidUser = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  username: 'johndoe',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
  },
  ...overrides
})

export const createInvalidUser = (invalidField: string, invalidValue: any) => ({
  ...createValidUser(),
  [invalidField]: invalidValue
})
```

### 3. Assertion Patterns

Use consistent assertion patterns:

```typescript
// Pattern 1: Success validation
const result = schema.safeParse(validData)
expect(result.success).toBe(true)
if (result.success) {
  expect(result.data).toEqual(expectedData)
}

// Pattern 2: Error validation
const result = schema.safeParse(invalidData)
expect(result.success).toBe(false)
if (!result.success) {
  expect(result.error.errors).toContainEqual(
    expect.objectContaining({
      path: ['fieldName'],
      message: 'Expected error message'
    })
  )
}

// Pattern 3: Utility function validation
const result = validateSchema(schema, data)
expect(result.success).toBe(false)
expect(result.error?.fieldErrors.fieldName).toContain('Error message')
```

### 4. Mocking External Dependencies

Mock external validation dependencies:

```typescript
// Mock async validation
vi.mock('@/lib/user-service', () => ({
  checkUsernameAvailability: vi.fn().mockResolvedValue(true),
  validateUserExists: vi.fn().mockResolvedValue(true),
}))

// Test async validation
it('should validate username availability', async () => {
  const schema = UserSchema.refine(async (data) => {
    return await checkUsernameAvailability(data.username)
  }, 'Username is not available')

  const result = await schema.safeParseAsync(userData)
  expect(result.success).toBe(true)
})
```

## Testing Strategies

### 1. Boundary Testing

Test edge cases and boundaries:

```typescript
describe('Boundary conditions', () => {
  it('should handle minimum length', () => {
    const data = { title: 'a' } // minimum 1 character
    expect(schema.safeParse(data).success).toBe(true)
  })

  it('should handle maximum length', () => {
    const data = { title: 'a'.repeat(200) } // maximum 200 characters
    expect(schema.safeParse(data).success).toBe(true)
  })

  it('should reject over maximum length', () => {
    const data = { title: 'a'.repeat(201) } // over maximum
    expect(schema.safeParse(data).success).toBe(false)
  })
})
```

### 2. Error Message Testing

Verify error messages are user-friendly:

```typescript
describe('Error messages', () => {
  it('should provide clear error for missing required field', () => {
    const result = schema.safeParse({})
    expect(result.success).toBe(false)
    
    if (!result.success) {
      const titleError = result.error.errors.find(e => e.path.includes('title'))
      expect(titleError?.message).toBe('Title is required')
    }
  })

  it('should provide clear error for invalid format', () => {
    const result = schema.safeParse({ email: 'invalid' })
    expect(result.success).toBe(false)
    
    if (!result.success) {
      const emailError = result.error.errors.find(e => e.path.includes('email'))
      expect(emailError?.message).toBe('Please enter a valid email address')
    }
  })
})
```

### 3. Performance Testing

Test schema performance with large datasets:

```typescript
describe('Performance', () => {
  it('should validate large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      title: `Task ${i}`,
      description: `Description for task ${i}`,
    }))

    const start = performance.now()
    const results = largeDataset.map(item => schema.safeParse(item))
    const end = performance.now()

    expect(end - start).toBeLessThan(1000) // Should complete in under 1 second
    expect(results.every(r => r.success)).toBe(true)
  })
})
```

## Common TDD Patterns

### 1. Schema Evolution

Test schema changes don't break existing functionality:

```typescript
describe('Schema evolution', () => {
  it('should maintain backward compatibility', () => {
    const oldData = { title: 'Task', status: 'pending' }
    const newData = { title: 'Task', status: 'pending', priority: 'medium' }

    expect(schema.safeParse(oldData).success).toBe(true)
    expect(schema.safeParse(newData).success).toBe(true)
  })

  it('should handle migration scenarios', () => {
    const legacyData = { name: 'Task', state: 'open' }
    const migrated = migrateLegacyTask(legacyData)
    
    expect(schema.safeParse(migrated).success).toBe(true)
  })
})
```

### 2. Conditional Validation

Test complex conditional logic:

```typescript
describe('Conditional validation', () => {
  it('should require dueDate when priority is high', () => {
    const highPriorityTask = { title: 'Urgent Task', priority: 'high' }
    
    const result = schema.safeParse(highPriorityTask)
    expect(result.success).toBe(false)
    
    if (!result.success) {
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          message: 'High priority tasks must have a due date'
        })
      )
    }
  })

  it('should allow no dueDate when priority is low', () => {
    const lowPriorityTask = { title: 'Optional Task', priority: 'low' }
    
    const result = schema.safeParse(lowPriorityTask)
    expect(result.success).toBe(true)
  })
})
```

### 3. Transform Testing

Test data transformations:

```typescript
describe('Data transformations', () => {
  it('should transform input data correctly', () => {
    const input = { title: '  Trim Me  ', tags: 'tag1,tag2,tag3' }
    const expected = { title: 'Trim Me', tags: ['tag1', 'tag2', 'tag3'] }

    const result = schema.safeParse(input)
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.data).toEqual(expected)
    }
  })
})
```

## Integration with Development Workflow

### 1. Pre-commit Hooks

Ensure schema tests pass before commits:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:schemas && npm run lint"
    }
  }
}
```

### 2. CI/CD Integration

Include schema testing in CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run schema tests
        run: npm run test:schemas
      - name: Run integration tests
        run: npm run test:integration
```

### 3. Documentation Generation

Generate schema documentation from tests:

```typescript
// Generate documentation from test descriptions
describe('UserProfileSchema', () => {
  it('validates user profile with required fields: id, email, username', () => {
    // This test serves as documentation
  })
  
  it('supports optional bio field with max 500 characters', () => {
    // This test documents the bio field behavior
  })
})
```

## Conclusion

TDD with Zod schemas provides a robust foundation for type-safe validation. By writing tests first, you ensure that your schemas meet requirements, handle edge cases, and provide clear error messages. The iterative nature of TDD allows for gradual complexity while maintaining confidence in the validation logic.

Remember to:
- Start with simple tests and gradually add complexity
- Test both success and failure cases
- Verify error messages are user-friendly
- Consider performance implications
- Maintain backward compatibility
- Integrate with your development workflow

This approach leads to more reliable, maintainable, and well-documented validation schemas.