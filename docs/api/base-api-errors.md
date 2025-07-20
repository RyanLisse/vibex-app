# Base API Error Handling

The BaseAPIError infrastructure provides standardized error handling across all API routes with automatic tracing, observability, and consistent error responses.

## Core Components

### BaseAPIError Class

The foundation for all API errors with built-in observability:

```typescript
import { BaseAPIError } from '@/lib/api/base'

// Basic usage
throw new BaseAPIError('Something went wrong', {
  statusCode: 500,
  code: 'INTERNAL_ERROR',
  details: { reason: 'Database connection failed' },
  context: { userId: '123', operation: 'updateProfile' }
})
```

### Built-in Error Classes

Pre-defined error classes for common scenarios:

#### ValidationError
```typescript
import { ValidationError } from '@/lib/api/base'

// Simple validation error
throw new ValidationError('Invalid email format')

// With validation details
throw new ValidationError('Validation failed', [
  { field: 'email', message: 'Invalid email format' },
  { field: 'age', message: 'Must be 18 or older' }
])
```

#### NotFoundError
```typescript
import { NotFoundError } from '@/lib/api/base'

// Resource not found
throw new NotFoundError('User', userId)
// Output: "User with id 123 not found"

// Generic not found
throw new NotFoundError('Configuration')
// Output: "Configuration not found"
```

#### UnauthorizedError
```typescript
import { UnauthorizedError } from '@/lib/api/base'

// Default message
throw new UnauthorizedError()
// Output: "Unauthorized"

// Custom message
throw new UnauthorizedError('Invalid authentication token')
```

#### ForbiddenError
```typescript
import { ForbiddenError } from '@/lib/api/base'

// Default message
throw new ForbiddenError()
// Output: "Forbidden"

// Custom message
throw new ForbiddenError('Insufficient permissions to access this resource')
```

#### ConflictError
```typescript
import { ConflictError } from '@/lib/api/base'

// Resource conflict
throw new ConflictError('Email already exists', {
  field: 'email',
  value: 'user@example.com'
})
```

#### RateLimitError
```typescript
import { RateLimitError } from '@/lib/api/base'

// Rate limit exceeded
throw new RateLimitError(60) // Retry after 60 seconds
```

#### DatabaseError
```typescript
import { DatabaseError } from '@/lib/api/base'

// Wrap database errors
try {
  await db.query(...)
} catch (error) {
  throw new DatabaseError('Failed to update user profile', error as Error)
}
```

#### ExternalServiceError
```typescript
import { ExternalServiceError } from '@/lib/api/base'

// External service failures
try {
  await fetch(apiUrl)
} catch (error) {
  throw new ExternalServiceError('PaymentGateway', error as Error)
}
```

## Error Response Format

All errors are automatically formatted into a consistent JSON response:

```json
{
  "success": false,
  "error": "User with id 123 not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "details": {
    "resource": "User",
    "id": "123"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Automatic Features

### 1. Observability Integration

Every error automatically:
- Records error metrics with appropriate labels
- Creates observability events for tracking
- Captures stack traces for debugging

```typescript
// Automatically recorded metrics:
observability.metrics.errorRate(1, 'api_error', {
  error_code: 'NOT_FOUND',
  status_code: '404'
})

// Automatically recorded event:
observability.events.collector.collectEvent(
  'api_error',
  'error',
  'User with id 123 not found',
  {
    code: 'NOT_FOUND',
    statusCode: 404,
    details: { resource: 'User', id: '123' },
    stack: '...'
  }
)
```

### 2. Tracing Integration

Errors integrate with OpenTelemetry tracing:

```typescript
// In your service method
async getUserById(id: string) {
  return this.executeWithTracing('getUserById', { userId: id }, async (span) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) })
    
    if (!user) {
      const error = new NotFoundError('User', id)
      error.recordInSpan(span) // Automatically records in trace
      throw error
    }
    
    return user
  })
}
```

### 3. Error Context

Add context to errors for better debugging:

```typescript
throw new BaseAPIError('Operation failed', {
  statusCode: 500,
  code: 'OPERATION_FAILED',
  context: {
    userId: request.userId,
    sessionId: request.sessionId,
    operation: 'updateUserProfile',
    timestamp: new Date().toISOString()
  }
})
```

## Best Practices

### 1. Use Specific Error Classes

```typescript
// ❌ Don't use generic errors
throw new Error('User not found')

// ✅ Use specific error classes
throw new NotFoundError('User', userId)
```

### 2. Provide Meaningful Error Details

```typescript
// ❌ Vague error message
throw new ValidationError('Invalid input')

// ✅ Specific error with details
throw new ValidationError('Profile update failed', [
  { field: 'email', message: 'Email format is invalid' },
  { field: 'birthDate', message: 'Birth date cannot be in the future' }
])
```

### 3. Include Context for Debugging

```typescript
// ❌ No context
throw new BaseAPIError('Database query failed')

// ✅ Include relevant context
throw new DatabaseError('Failed to update user preferences', originalError, {
  userId: user.id,
  operation: 'updatePreferences',
  attemptedChanges: preferences
})
```

### 4. Handle External Service Errors

```typescript
// ❌ Let external errors bubble up
const response = await fetch(externalAPI)

// ✅ Wrap external errors
try {
  const response = await fetch(externalAPI)
  if (!response.ok) {
    throw new ExternalServiceError('WeatherAPI', new Error(`HTTP ${response.status}`))
  }
  return response.json()
} catch (error) {
  if (error instanceof ExternalServiceError) throw error
  throw new ExternalServiceError('WeatherAPI', error as Error)
}
```

### 5. Chain Errors Appropriately

```typescript
// Service layer
async updateUserProfile(userId: string, data: UpdateProfileData) {
  try {
    // Validate user exists
    const user = await this.getUserById(userId) // Might throw NotFoundError
    
    // Validate data
    if (!isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format')
    }
    
    // Update in database
    try {
      return await db.update(users).set(data).where(eq(users.id, userId))
    } catch (dbError) {
      throw new DatabaseError('Failed to update user profile', dbError as Error)
    }
  } catch (error) {
    // Re-throw API errors, wrap others
    if (error instanceof BaseAPIError) throw error
    throw new BaseAPIError('Profile update failed', {
      statusCode: 500,
      details: error
    })
  }
}
```

## Error Codes Reference

Standard error codes used across the application:

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `INVALID_REQUEST` | Malformed request | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `METHOD_NOT_ALLOWED` | HTTP method not allowed | 405 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error | 502 |
| `SERVICE_UNAVAILABLE` | Service temporarily down | 503 |

## Testing Error Handling

```typescript
import { describe, it, expect } from 'vitest'
import { NotFoundError, ValidationError } from '@/lib/api/base'

describe('UserService', () => {
  it('should throw NotFoundError for non-existent user', async () => {
    await expect(userService.getUser('invalid-id'))
      .rejects.toThrow(NotFoundError)
  })

  it('should throw ValidationError for invalid email', async () => {
    await expect(userService.updateEmail('user-id', 'invalid-email'))
      .rejects.toThrow(ValidationError)
  })

  it('should include error details in validation errors', async () => {
    try {
      await userService.createUser({ email: 'invalid' })
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.details).toContainEqual({
        field: 'email',
        message: 'Invalid email format'
      })
    }
  })
})
```

## Troubleshooting

### Common Issues

1. **Errors not being caught by handler**
   - Ensure you're using `BaseAPIHandler` wrapper
   - Check that async operations are properly awaited

2. **Missing error details in response**
   - Verify you're throwing `BaseAPIError` instances
   - Check that error details are serializable

3. **Observability events not recorded**
   - Ensure observability is properly initialized
   - Check for errors in console logs

4. **Stack traces in production**
   - Configure environment-based error detail exposure
   - Use error monitoring service for production debugging