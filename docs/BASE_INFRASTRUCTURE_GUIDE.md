# Base Infrastructure Guide

This guide has been updated and expanded. Please refer to the comprehensive documentation in the `docs/api/` directory.

## 📚 Documentation Structure

### Core Infrastructure Documentation
- **[API Documentation Index](./api/README.md)** - Complete guide to the base API infrastructure
- **[Getting Started Guide](./api/getting-started.md)** - Quick start guide for developers
- **[Migration Guide](./api/migration-guide.md)** - Migrating existing code to use base infrastructure

### Component Documentation
- **[Base API Errors](./api/base-api-errors.md)** - Standardized error handling
- **[Base API Service](./api/base-api-service.md)** - Service layer patterns
- **[Base API Handler](./api/base-api-handler.md)** - Request handling and validation
- **[Query Builder](./api/query-builder.md)** - Type-safe database queries
- **[Response Builder](./api/response-builder.md)** - Consistent response formatting

### Best Practices & Advanced Topics
- **[Best Practices](./api/best-practices.md)** - Recommended patterns and conventions
- **[Testing Patterns](./api/testing-patterns.md)** - Testing strategies for APIs
- **[Performance Optimization](./api/performance-optimization.md)** - Optimizing API performance
- **[Security Patterns](./api/security-patterns.md)** - Security best practices
- **[Observability Integration](./api/observability-integration.md)** - Monitoring and tracing
- **[Error Code Reference](./api/error-code-reference.md)** - Complete error code reference

## 🚀 Quick Start

```typescript
// 1. Create an API route using base infrastructure
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  // Your logic here
  return { message: 'Hello, World!' }
})

// 2. Create a service with automatic tracing
import { BaseAPIService, NotFoundError } from '@/lib/api/base'

class UserService extends BaseAPIService {
  constructor() {
    super({ serviceName: 'users' })
  }

  async getUser(id: string, context: ServiceContext) {
    return this.executeWithTracing('getUser', context, async (span) => {
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

// 3. Use the service in your route
export const GET = BaseAPIHandler.GET(async (context) => {
  const user = await userService.getUser(context.query.id, context)
  return ResponseBuilder.success(user)
})
```

## 🏗️ Architecture Overview

The base infrastructure provides a layered architecture:

```
┌─────────────────────┐
│   API Routes        │  ← BaseAPIHandler (Request handling)
├─────────────────────┤
│   Service Layer     │  ← BaseAPIService (Business logic)
├─────────────────────┤
│   Data Access       │  ← QueryBuilder (Database queries)
├─────────────────────┤
│   Database          │  ← Drizzle ORM
└─────────────────────┘
```

## ✨ Key Features

- **🛡️ Type Safety** - Full TypeScript support with type inference
- **🚦 Error Handling** - Standardized error responses with proper HTTP status codes
- **📊 Observability** - Built-in tracing, metrics, and event logging
- **🔒 Security** - Input validation, authentication, and rate limiting
- **⚡ Performance** - Query optimization, caching, and response compression
- **🧪 Testability** - Clear separation of concerns for easy testing

## 📋 Migration Checklist

When migrating existing routes:

- [ ] Replace custom error handling with `BaseAPIError` classes
- [ ] Wrap route handlers with `BaseAPIHandler`
- [ ] Move business logic to service classes extending `BaseAPIService`
- [ ] Use `QueryBuilder` for database operations
- [ ] Replace custom responses with `ResponseBuilder`
- [ ] Add proper validation with Zod schemas
- [ ] Implement authentication where needed
- [ ] Add tracing and metrics
- [ ] Update tests to use new patterns

## 🔗 Related Documentation

- [API Routes Guide](./API_ROUTES_GUIDE.md) - General API routes documentation
- [Testing Strategy](./TESTING_STRATEGY.md) - Overall testing approach
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md) - System-wide performance guide
- [Developer Guide](./DEVELOPER_GUIDE.md) - General development guidelines

---

For detailed information and examples, please explore the comprehensive documentation in the `docs/api/` directory.