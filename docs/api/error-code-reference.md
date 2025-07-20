# Error Code Reference

This document provides a comprehensive reference for all error codes used in the API, their meanings, and how to handle them.

## Error Response Format

All API errors follow this consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "details": {
    // Additional context-specific information
  },
  "timestamp": "2024-01-20T10:30:00.000Z",
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0"
  }
}
```

## HTTP Status Codes

| Status | Category | Description |
|--------|----------|-------------|
| **200** | Success | Request succeeded |
| **201** | Success | Resource created |
| **204** | Success | No content (successful deletion) |
| **400** | Client Error | Bad request / Validation error |
| **401** | Client Error | Authentication required |
| **403** | Client Error | Forbidden / Insufficient permissions |
| **404** | Client Error | Resource not found |
| **405** | Client Error | Method not allowed |
| **409** | Client Error | Conflict (duplicate resource) |
| **429** | Client Error | Rate limit exceeded |
| **500** | Server Error | Internal server error |
| **502** | Server Error | External service error |
| **503** | Server Error | Service unavailable |

## Error Codes by Category

### Validation Errors (400)

#### VALIDATION_ERROR
**Description**: Request validation failed  
**Common Causes**:
- Missing required fields
- Invalid field format
- Field value out of range

**Example Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    },
    {
      "field": "age",
      "message": "Number must be greater than or equal to 18",
      "code": "too_small"
    }
  ]
}
```

**How to Handle**:
```typescript
if (error.code === 'VALIDATION_ERROR') {
  error.details.forEach(detail => {
    showFieldError(detail.field, detail.message)
  })
}
```

#### INVALID_REQUEST
**Description**: Malformed request  
**Common Causes**:
- Invalid JSON syntax
- Missing content-type header
- Request body too large

**Example Response**:
```json
{
  "success": false,
  "error": "Invalid request body",
  "code": "INVALID_REQUEST",
  "statusCode": 400
}
```

#### INVALID_PARAMETER
**Description**: Invalid query parameter  
**Common Causes**:
- Invalid parameter value
- Unknown parameter name
- Parameter type mismatch

**Example Response**:
```json
{
  "success": false,
  "error": "Invalid parameter: page must be a positive integer",
  "code": "INVALID_PARAMETER",
  "statusCode": 400,
  "details": {
    "parameter": "page",
    "value": "-1",
    "expected": "positive integer"
  }
}
```

### Authentication Errors (401)

#### UNAUTHORIZED
**Description**: Authentication required but not provided  
**Common Causes**:
- Missing authentication token
- Invalid token format
- Expired token

**Example Response**:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "statusCode": 401
}
```

**How to Handle**:
```typescript
if (error.code === 'UNAUTHORIZED') {
  // Redirect to login
  router.push('/login')
}
```

#### TOKEN_EXPIRED
**Description**: Authentication token has expired  
**Common Causes**:
- JWT token past expiration time
- Session timeout

**Example Response**:
```json
{
  "success": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED",
  "statusCode": 401,
  "details": {
    "expiredAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**How to Handle**:
```typescript
if (error.code === 'TOKEN_EXPIRED') {
  // Try to refresh token
  const newToken = await refreshToken()
  if (newToken) {
    // Retry request with new token
    return retryRequest()
  }
  // Redirect to login
  router.push('/login')
}
```

#### INVALID_CREDENTIALS
**Description**: Invalid login credentials  
**Common Causes**:
- Wrong username/password
- Account doesn't exist
- Account deactivated

**Example Response**:
```json
{
  "success": false,
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "statusCode": 401
}
```

### Authorization Errors (403)

#### FORBIDDEN
**Description**: Insufficient permissions  
**Common Causes**:
- User lacks required role
- Resource access denied
- Feature not available for user tier

**Example Response**:
```json
{
  "success": false,
  "error": "Insufficient permissions to access this resource",
  "code": "FORBIDDEN",
  "statusCode": 403,
  "details": {
    "requiredRole": "admin",
    "userRoles": ["user"]
  }
}
```

#### ACCOUNT_LOCKED
**Description**: Account has been locked  
**Common Causes**:
- Too many failed login attempts
- Security violation
- Manual lock by admin

**Example Response**:
```json
{
  "success": false,
  "error": "Account locked due to multiple failed login attempts",
  "code": "ACCOUNT_LOCKED",
  "statusCode": 403,
  "details": {
    "lockedAt": "2024-01-20T10:00:00.000Z",
    "reason": "multiple_failed_attempts"
  }
}
```

### Not Found Errors (404)

#### NOT_FOUND
**Description**: Requested resource not found  
**Common Causes**:
- Invalid resource ID
- Resource deleted
- Wrong endpoint

**Example Response**:
```json
{
  "success": false,
  "error": "User with id 123 not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "details": {
    "resource": "User",
    "id": "123"
  }
}
```

**How to Handle**:
```typescript
if (error.code === 'NOT_FOUND') {
  if (error.details.resource === 'User') {
    showMessage('User not found')
    router.push('/users')
  }
}
```

### Conflict Errors (409)

#### CONFLICT
**Description**: Resource conflict  
**Common Causes**:
- Duplicate resource creation
- Concurrent modification
- Unique constraint violation

**Example Response**:
```json
{
  "success": false,
  "error": "Email already registered",
  "code": "CONFLICT",
  "statusCode": 409,
  "details": {
    "field": "email",
    "value": "user@example.com"
  }
}
```

#### DUPLICATE_RESOURCE
**Description**: Attempting to create duplicate resource  
**Common Causes**:
- Resource with same identifier exists
- Unique field collision

**Example Response**:
```json
{
  "success": false,
  "error": "Product with SKU 'ABC123' already exists",
  "code": "DUPLICATE_RESOURCE",
  "statusCode": 409,
  "details": {
    "resource": "Product",
    "field": "sku",
    "value": "ABC123"
  }
}
```

### Rate Limit Errors (429)

#### RATE_LIMIT_EXCEEDED
**Description**: Too many requests  
**Common Causes**:
- Exceeded API rate limit
- Too many requests from IP
- Account limit reached

**Example Response**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "statusCode": 429,
  "details": {
    "limit": 100,
    "window": "1h",
    "retryAfter": 3600
  }
}
```

**How to Handle**:
```typescript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  const retryAfter = error.details.retryAfter * 1000
  setTimeout(() => {
    retryRequest()
  }, retryAfter)
}
```

### Server Errors (500)

#### INTERNAL_ERROR
**Description**: Unexpected server error  
**Common Causes**:
- Unhandled exception
- Server misconfiguration
- Unknown error

**Example Response**:
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "statusCode": 500,
  "details": {
    "message": "An unexpected error occurred"
  }
}
```

#### DATABASE_ERROR
**Description**: Database operation failed  
**Common Causes**:
- Connection lost
- Query timeout
- Constraint violation

**Example Response**:
```json
{
  "success": false,
  "error": "Database operation failed",
  "code": "DATABASE_ERROR",
  "statusCode": 500,
  "details": {
    "operation": "insert",
    "table": "users"
  }
}
```

#### EXTERNAL_SERVICE_ERROR
**Description**: External service failure  
**Common Causes**:
- Third-party API down
- Network timeout
- Invalid response

**Example Response**:
```json
{
  "success": false,
  "error": "External service error: PaymentGateway",
  "code": "EXTERNAL_SERVICE_ERROR",
  "statusCode": 502,
  "details": {
    "service": "PaymentGateway",
    "error": "Connection timeout"
  }
}
```

### Service Unavailable (503)

#### SERVICE_UNAVAILABLE
**Description**: Service temporarily unavailable  
**Common Causes**:
- Maintenance mode
- System overload
- Deployment in progress

**Example Response**:
```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "statusCode": 503,
  "details": {
    "reason": "maintenance",
    "retryAfter": 3600
  }
}
```

## Business Logic Error Codes

### INSUFFICIENT_FUNDS
**Description**: Insufficient funds for transaction  
**Status**: 400  
**Example**:
```json
{
  "code": "INSUFFICIENT_FUNDS",
  "error": "Insufficient funds for transaction",
  "details": {
    "required": 100.00,
    "available": 75.50,
    "currency": "USD"
  }
}
```

### QUOTA_EXCEEDED
**Description**: User quota exceeded  
**Status**: 403  
**Example**:
```json
{
  "code": "QUOTA_EXCEEDED",
  "error": "Monthly API quota exceeded",
  "details": {
    "quota": 10000,
    "used": 10000,
    "resetDate": "2024-02-01T00:00:00.000Z"
  }
}
```

### INVALID_STATE_TRANSITION
**Description**: Invalid state transition  
**Status**: 400  
**Example**:
```json
{
  "code": "INVALID_STATE_TRANSITION",
  "error": "Cannot transition from 'completed' to 'pending'",
  "details": {
    "currentState": "completed",
    "requestedState": "pending",
    "allowedTransitions": ["archived"]
  }
}
```

## Error Handling Best Practices

### Client-Side Error Handling

```typescript
class APIErrorHandler {
  handle(error: APIError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        this.handleValidationError(error)
        break
        
      case 'UNAUTHORIZED':
      case 'TOKEN_EXPIRED':
        this.handleAuthError(error)
        break
        
      case 'RATE_LIMIT_EXCEEDED':
        this.handleRateLimit(error)
        break
        
      case 'NOT_FOUND':
        this.handleNotFound(error)
        break
        
      default:
        this.handleGenericError(error)
    }
  }
  
  private handleValidationError(error: APIError) {
    // Show field-specific errors
    error.details?.forEach(detail => {
      formErrors.setFieldError(detail.field, detail.message)
    })
  }
  
  private handleAuthError(error: APIError) {
    // Clear auth state and redirect
    authStore.logout()
    router.push('/login')
  }
  
  private handleRateLimit(error: APIError) {
    const retryAfter = error.details?.retryAfter || 60
    toast.error(`Rate limit exceeded. Try again in ${retryAfter} seconds`)
  }
  
  private handleNotFound(error: APIError) {
    toast.error(`${error.details?.resource || 'Resource'} not found`)
    router.back()
  }
  
  private handleGenericError(error: APIError) {
    toast.error(error.error || 'An error occurred')
    console.error('API Error:', error)
  }
}
```

### Retry Logic

```typescript
async function retryableRequest<T>(
  request: () => Promise<T>,
  options: {
    maxRetries?: number
    retryDelay?: number
    retryableErrors?: string[]
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryableErrors = ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'DATABASE_ERROR']
  } = options
  
  let lastError: Error
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await request()
    } catch (error) {
      lastError = error
      
      if (
        error.code && 
        retryableErrors.includes(error.code) && 
        attempt < maxRetries - 1
      ) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
  
  throw lastError!
}

// Usage
const data = await retryableRequest(
  () => api.get('/users/123'),
  {
    maxRetries: 5,
    retryableErrors: ['INTERNAL_ERROR', 'DATABASE_ERROR']
  }
)
```

### Error Recovery Strategies

```typescript
class ErrorRecovery {
  async handleWithFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    errorCodes: string[] = ['EXTERNAL_SERVICE_ERROR', 'SERVICE_UNAVAILABLE']
  ): Promise<T> {
    try {
      return await primary()
    } catch (error) {
      if (error.code && errorCodes.includes(error.code)) {
        console.warn('Primary failed, using fallback:', error)
        return await fallback()
      }
      throw error
    }
  }
  
  async handleWithCache<T>(
    request: () => Promise<T>,
    cacheKey: string
  ): Promise<T> {
    try {
      const result = await request()
      // Cache successful result
      cache.set(cacheKey, result)
      return result
    } catch (error) {
      // Try cache on specific errors
      if (['EXTERNAL_SERVICE_ERROR', 'SERVICE_UNAVAILABLE'].includes(error.code)) {
        const cached = cache.get(cacheKey)
        if (cached) {
          console.warn('Using cached data due to error:', error)
          return cached
        }
      }
      throw error
    }
  }
}
```

## Common Error Scenarios

### Registration Flow
```
1. VALIDATION_ERROR - Invalid email/password format
2. CONFLICT - Email already registered
3. RATE_LIMIT_EXCEEDED - Too many registration attempts
4. INTERNAL_ERROR - Server issue during creation
```

### Authentication Flow
```
1. VALIDATION_ERROR - Missing credentials
2. INVALID_CREDENTIALS - Wrong email/password
3. ACCOUNT_LOCKED - Too many failed attempts
4. TOKEN_EXPIRED - Session expired
```

### Data Modification Flow
```
1. UNAUTHORIZED - Not logged in
2. FORBIDDEN - Insufficient permissions
3. NOT_FOUND - Resource doesn't exist
4. CONFLICT - Concurrent modification
5. VALIDATION_ERROR - Invalid data format
```

### Payment Flow
```
1. VALIDATION_ERROR - Invalid payment details
2. INSUFFICIENT_FUNDS - Not enough balance
3. EXTERNAL_SERVICE_ERROR - Payment gateway issue
4. CONFLICT - Duplicate transaction
```