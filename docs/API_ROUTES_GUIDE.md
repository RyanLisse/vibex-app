# API Routes Guide

This document provides comprehensive documentation for the API routes architecture, patterns, and best practices used in the CloneDx application.

## Overview

The API layer is built with Next.js App Router and follows REST principles with enhanced features:

- **Type-safe validation** with Zod schemas
- **OpenTelemetry tracing** for observability
- **Structured error handling** with consistent responses
- **Rate limiting** and security measures
- **Automatic documentation** generation

## API Route Structure

```
app/api/
├── agents/              # AI agent management
│   ├── brainstorm/
│   ├── route.ts
│   └── voice/
├── auth/                # Authentication endpoints
│   ├── anthropic/
│   ├── github/
│   └── openai/
├── environments/        # Environment management
│   ├── route.ts
│   └── [id]/
├── tasks/               # Task management
│   ├── route.ts
│   └── [id]/
├── inngest/             # Background job webhooks
├── migration/           # Data migration endpoints
└── electric/            # ElectricSQL endpoints
```

## Standard Route Pattern

### File Structure

Each API route follows this pattern:

```typescript
// app/api/resource/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { db } from "@/db/config";
import { resourceTable } from "@/db/schema";
import { observability } from "@/lib/observability";

// 1. Validation Schemas
const CreateResourceSchema = z.object({
  // Define schema
});

const GetResourcesQuerySchema = z.object({
  // Query parameters
});

// 2. Error Classes
class ResourceAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "ResourceAPIError";
  }
}

// 3. Service Layer
class ResourceService {
  static async getResources(params) {
    // Business logic with tracing
  }

  static async createResource(data) {
    // Business logic with tracing
  }
}

// 4. Route Handlers
export async function GET(request: NextRequest) {
  // Implementation
}

export async function POST(request: NextRequest) {
  // Implementation
}
```

### Response Standards

All API responses follow consistent formats:

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Paginated Response
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message: string;
  timestamp: string;
}
```

### Helper Functions

```typescript
// app/lib/api/responses.ts
export function createApiSuccessResponse<T>(
  data: T,
  message: string = "Success",
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function createApiErrorResponse(
  message: string,
  statusCode: number = 500,
  code: string = "INTERNAL_ERROR",
  details?: any,
): ErrorResponse {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message: string = "Data retrieved successfully",
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString(),
  };
}
```

## Detailed Route Examples

### Environment Management API

#### GET /api/environments

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedParams = GetEnvironmentsQuerySchema.parse(queryParams);

    // Get environments from service
    const result = await EnvironmentsService.getEnvironments(validatedParams);

    return NextResponse.json(
      createPaginatedResponse(
        result.environments,
        result.pagination,
        "Environments retrieved successfully",
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse(
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          error.issues,
        ),
        { status: 400 },
      );
    }

    if (error instanceof EnvironmentsAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      createApiErrorResponse("Internal server error", 500, "INTERNAL_ERROR"),
      { status: 500 },
    );
  }
}
```

#### POST /api/environments

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = CreateEnvironmentSchema.parse(body);

    // Create environment
    const environment =
      await EnvironmentsService.createEnvironment(validatedData);

    return NextResponse.json(
      createApiSuccessResponse(environment, "Environment created successfully"),
      { status: 201 },
    );
  } catch (error) {
    // Error handling...
  }
}
```

### Task Management API

#### GET /api/tasks

```typescript
const GetTasksQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["created_at", "updated_at", "title", "priority"])
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  userId: z.string().optional(),
});

class TasksService {
  static async getTasks(params: z.infer<typeof GetTasksQuerySchema>) {
    const tracer = trace.getTracer("tasks-api");
    const span = tracer.startSpan("tasks.getTasks");

    try {
      const startTime = Date.now();

      // Build dynamic query conditions
      const conditions = [];
      if (params.status) conditions.push(eq(tasks.status, params.status));
      if (params.priority) conditions.push(eq(tasks.priority, params.priority));
      if (params.assignee) conditions.push(eq(tasks.assignee, params.assignee));
      if (params.userId) conditions.push(eq(tasks.userId, params.userId));
      if (params.search)
        conditions.push(like(tasks.title, `%${params.search}%`));

      // Dynamic sorting
      const sortColumn = tasks[params.sortBy as keyof typeof tasks];
      const orderBy =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Execute query with pagination
      const offset = (params.page - 1) * params.limit;
      const [taskResults, countResult] = await Promise.all([
        db
          .select()
          .from(tasks)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(params.limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(tasks)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      const duration = Date.now() - startTime;

      // Record observability metrics
      observability.metrics.queryDuration(duration, "select_tasks", true);
      await observability.events.collector.collectEvent(
        "query_end",
        "debug",
        "Tasks query completed",
        { duration, resultCount: taskResults.length, filters: params },
        "api",
        ["tasks", "query"],
      );

      span.setAttributes({
        "tasks.count": taskResults.length,
        "tasks.total": Number(countResult[0].count),
        "query.duration": duration,
      });

      return {
        tasks: taskResults,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: Number(countResult[0].count),
          totalPages: Math.ceil(Number(countResult[0].count) / params.limit),
        },
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      observability.metrics.errorRate(1, "tasks_api");
      throw new TasksAPIError(
        "Failed to fetch tasks",
        500,
        "FETCH_TASKS_ERROR",
      );
    } finally {
      span.end();
    }
  }
}
```

### Dynamic Route Handlers

#### GET /api/tasks/[id]

```typescript
// app/api/tasks/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Validate path parameters
    const { id } = z.object({ id: z.string().ulid() }).parse(params);

    // Get task from service
    const task = await TasksService.getTaskById(id);

    if (!task) {
      return NextResponse.json(
        createApiErrorResponse("Task not found", 404, "TASK_NOT_FOUND"),
        { status: 404 },
      );
    }

    return NextResponse.json(
      createApiSuccessResponse(task, "Task retrieved successfully"),
    );
  } catch (error) {
    // Error handling...
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = z.object({ id: z.string().ulid() }).parse(params);
    const body = await request.json();
    const updates = UpdateTaskSchema.parse(body);

    const updatedTask = await TasksService.updateTask(id, updates);

    return NextResponse.json(
      createApiSuccessResponse(updatedTask, "Task updated successfully"),
    );
  } catch (error) {
    // Error handling...
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = z.object({ id: z.string().ulid() }).parse(params);

    await TasksService.deleteTask(id);

    return NextResponse.json(
      createApiSuccessResponse(null, "Task deleted successfully"),
    );
  } catch (error) {
    // Error handling...
  }
}
```

## Authentication & Authorization

### Auth Middleware

```typescript
// lib/auth/middleware.ts
export async function withAuth(
  handler: (
    request: NextRequest,
    context: AuthContext,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest, params: any) => {
    try {
      // Extract token from headers
      const token = request.headers
        .get("authorization")
        ?.replace("Bearer ", "");

      if (!token) {
        return NextResponse.json(
          createApiErrorResponse("Authorization required", 401, "UNAUTHORIZED"),
          { status: 401 },
        );
      }

      // Verify token and get user
      const user = await verifyToken(token);

      if (!user) {
        return NextResponse.json(
          createApiErrorResponse("Invalid token", 401, "INVALID_TOKEN"),
          { status: 401 },
        );
      }

      // Create auth context
      const context: AuthContext = { user, token };

      return handler(request, context);
    } catch (error) {
      return NextResponse.json(
        createApiErrorResponse("Authentication failed", 401, "AUTH_FAILED"),
        { status: 401 },
      );
    }
  };
}

// Usage in routes
export const GET = withAuth(async (request, { user }) => {
  // User is authenticated
  const tasks = await TasksService.getUserTasks(user.id);
  return NextResponse.json(createApiSuccessResponse(tasks));
});
```

### Role-Based Access Control

```typescript
// lib/auth/permissions.ts
export function withPermissions(permissions: string[]) {
  return function (handler: AuthenticatedHandler) {
    return withAuth(async (request, context) => {
      const userPermissions = await getUserPermissions(context.user.id);

      const hasPermission = permissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        return NextResponse.json(
          createApiErrorResponse("Insufficient permissions", 403, "FORBIDDEN"),
          { status: 403 },
        );
      }

      return handler(request, context);
    });
  };
}

// Usage
export const DELETE = withPermissions(["tasks:delete"])(async (
  request,
  { user },
  { params },
) => {
  // User has tasks:delete permission
});
```

## Validation Patterns

### Input Validation

```typescript
// Common validation schemas
const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const SortingSchema = z.object({
  sortBy: z.string().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const SearchSchema = z.object({
  search: z.string().optional(),
  filter: z.record(z.any()).optional(),
});

// Compose schemas
const GetResourcesSchema = PaginationSchema.merge(SortingSchema)
  .merge(SearchSchema)
  .extend({
    status: z.enum(["active", "inactive"]).optional(),
  });
```

### Custom Validators

```typescript
// Custom ULID validator
const ulidSchema = z
  .string()
  .refine((val) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(val), {
    message: "Invalid ULID format",
  });

// Date range validator
const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be before end date",
  });

// File upload validator
const fileUploadSchema = z.object({
  filename: z.string().min(1),
  size: z.number().max(10 * 1024 * 1024), // 10MB
  type: z.enum(["image/jpeg", "image/png", "application/pdf"]),
});
```

## Error Handling

### Error Hierarchy

```typescript
// Base API error
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// Specific error types
class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

class RateLimitError extends APIError {
  constructor() {
    super("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
  }
}
```

### Global Error Handler

```typescript
// lib/api/error-handler.ts
export function handleAPIError(error: unknown): NextResponse {
  // Log error with context
  console.error("API Error:", error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      createApiErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        error.issues,
      ),
      { status: 400 },
    );
  }

  if (error instanceof APIError) {
    return NextResponse.json(
      createApiErrorResponse(
        error.message,
        error.statusCode,
        error.code,
        error.details,
      ),
      { status: error.statusCode },
    );
  }

  // Unexpected errors
  return NextResponse.json(
    createApiErrorResponse("Internal server error", 500, "INTERNAL_ERROR"),
    { status: 500 },
  );
}

// Usage in routes
export async function GET(request: NextRequest) {
  try {
    // Route logic
  } catch (error) {
    return handleAPIError(error);
  }
}
```

## Rate Limiting

### Implementation

```typescript
// lib/rate-limit.ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export async function rateLimit(
  key: string,
  limit: number,
  window: number, // seconds
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const resetTime = Date.now() + ttl * 1000;

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetTime,
  };
}

// Middleware
export function withRateLimit(
  limit: number = 100,
  window: number = 3600, // 1 hour
) {
  return function (handler: RouteHandler) {
    return async (request: NextRequest, ...args: any[]) => {
      const ip = getClientIP(request);
      const key = `rate_limit:${ip}`;

      const { allowed, remaining, resetTime } = await rateLimit(
        key,
        limit,
        window,
      );

      if (!allowed) {
        return NextResponse.json(
          createApiErrorResponse(
            "Rate limit exceeded",
            429,
            "RATE_LIMIT_EXCEEDED",
          ),
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": resetTime.toString(),
            },
          },
        );
      }

      const response = await handler(request, ...args);

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", resetTime.toString());

      return response;
    };
  };
}
```

## OpenTelemetry Integration

### Automatic Tracing

```typescript
// lib/observability/tracing.ts
export function withTracing(operationName: string) {
  return function (handler: RouteHandler) {
    return async (request: NextRequest, ...args: any[]) => {
      const tracer = trace.getTracer("api");
      const span = tracer.startSpan(operationName);

      try {
        // Add request attributes
        span.setAttributes({
          "http.method": request.method,
          "http.url": request.url,
          "http.route": request.nextUrl.pathname,
        });

        const startTime = Date.now();
        const response = await handler(request, ...args);
        const duration = Date.now() - startTime;

        // Add response attributes
        span.setAttributes({
          "http.status_code": response.status,
          "http.response_time": duration,
        });

        return response;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    };
  };
}

// Usage
export const GET = withTracing("get_tasks")(async (request) => {
  // Handler logic
});
```

## Testing API Routes

### Unit Tests

```typescript
// __tests__/api/tasks.test.ts
import { createMocks } from "node-mocks-http";
import { GET, POST } from "@/app/api/tasks/route";

describe("/api/tasks", () => {
  describe("GET", () => {
    it("returns paginated tasks", async () => {
      const { req } = createMocks({
        method: "GET",
        url: "/api/tasks?page=1&limit=10",
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
    });

    it("validates query parameters", async () => {
      const { req } = createMocks({
        method: "GET",
        url: "/api/tasks?page=invalid",
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST", () => {
    it("creates a new task", async () => {
      const taskData = {
        title: "Test Task",
        description: "Test Description",
        userId: "test-user-id",
      };

      const { req } = createMocks({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: taskData,
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe(taskData.title);
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/tasks-api.test.ts
import { describe, it, expect, beforeEach } from "vitest";

describe("Tasks API Integration", () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  it("handles full CRUD operations", async () => {
    // Create
    const createResponse = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Task", userId: "test-user" }),
    });

    expect(createResponse.status).toBe(201);
    const { data: createdTask } = await createResponse.json();

    // Read
    const getResponse = await fetch(`/api/tasks/${createdTask.id}`);
    expect(getResponse.status).toBe(200);

    // Update
    const updateResponse = await fetch(`/api/tasks/${createdTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Task" }),
    });

    expect(updateResponse.status).toBe(200);

    // Delete
    const deleteResponse = await fetch(`/api/tasks/${createdTask.id}`, {
      method: "DELETE",
    });

    expect(deleteResponse.status).toBe(200);
  });
});
```

## Best Practices

### 1. Consistent Structure

- Follow the established pattern for all routes
- Use the same validation and error handling approach
- Implement proper observability

### 2. Security

- Always validate inputs with Zod
- Implement authentication and authorization
- Use rate limiting for public endpoints
- Sanitize data before database operations

### 3. Performance

- Use appropriate database indexes
- Implement pagination for list endpoints
- Cache responses when appropriate
- Monitor query performance

### 4. Documentation

- Use OpenAPI/Swagger for API documentation
- Include examples in comments
- Document error responses
- Keep this guide updated

### 5. Testing

- Write unit tests for all routes
- Include integration tests for complex flows
- Test error scenarios
- Verify security measures

This API routes guide provides the foundation for building robust, secure, and maintainable API endpoints in the CloneDx application.
