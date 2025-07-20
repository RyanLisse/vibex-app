# API Infrastructure Documentation

This directory contains comprehensive documentation for the base API infrastructure patterns used throughout the application.

## Table of Contents

### Core Infrastructure
- [Base API Error Handling](./base-api-errors.md) - Standardized error handling across all API routes
- [Base API Service](./base-api-service.md) - Service layer patterns with tracing and observability
- [Base API Handler](./base-api-handler.md) - Request handling and validation patterns
- [Query Builder](./query-builder.md) - Type-safe database query construction
- [Response Builder](./response-builder.md) - Consistent API response formatting

### Usage Guides
- [Getting Started](./getting-started.md) - Quick start guide for using base infrastructure
- [Migration Guide](./migration-guide.md) - Migrating existing routes to base infrastructure
- [Best Practices](./best-practices.md) - Recommended patterns and conventions
- [Testing Patterns](./testing-patterns.md) - Testing API routes with base infrastructure

### Advanced Topics
- [Performance Optimization](./performance-optimization.md) - Optimizing API performance
- [Security Patterns](./security-patterns.md) - Security best practices for API routes
- [Observability Integration](./observability-integration.md) - Monitoring and tracing
- [Error Code Reference](./error-code-reference.md) - Standard error codes and meanings

## Quick Start

```typescript
// Example API route using base infrastructure
import { BaseAPIHandler, BaseAPIService, ResponseBuilder } from '@/lib/api/base'

class UserService extends BaseAPIService {
  constructor() {
    super({ serviceName: 'users' })
  }

  async getUser(id: string) {
    return this.executeWithTracing('getUser', { userId: id }, async (span) => {
      // Your business logic here
      const user = await db.query.users.findFirst({
        where: eq(users.id, id)
      })
      
      if (!user) {
        throw new NotFoundError('User', id)
      }
      
      return user
    })
  }
}

const userService = new UserService()

export const GET = BaseAPIHandler.GET(async (context) => {
  const userId = context.query.id
  const user = await userService.getUser(userId)
  return ResponseBuilder.success(user)
})
```

## Architecture Overview

The base infrastructure follows a layered architecture:

```
┌─────────────────────┐
│   API Route Layer   │  ← BaseAPIHandler
├─────────────────────┤
│   Service Layer     │  ← BaseAPIService
├─────────────────────┤
│   Data Access Layer │  ← QueryBuilder
├─────────────────────┤
│   Database Layer    │  ← Drizzle ORM
└─────────────────────┘
```

Each layer provides specific functionality:
- **API Route Layer**: Request handling, validation, and response formatting
- **Service Layer**: Business logic, tracing, and observability
- **Data Access Layer**: Query construction and database operations
- **Database Layer**: Direct database interactions

## Key Benefits

1. **Consistency**: Uniform error handling and response formats across all APIs
2. **Observability**: Built-in tracing, metrics, and event logging
3. **Type Safety**: Full TypeScript support with type inference
4. **Performance**: Automatic query optimization and monitoring
5. **Security**: Input validation and sanitization by default
6. **Maintainability**: Clear separation of concerns and reusable patterns

## Getting Help

- Check the [Getting Started Guide](./getting-started.md) for basic usage
- Review [Migration Guide](./migration-guide.md) for updating existing code
- See [Best Practices](./best-practices.md) for recommended patterns
- Refer to [Testing Patterns](./testing-patterns.md) for testing strategies

For questions or issues, please check the troubleshooting section in each guide or reach out to the API team.