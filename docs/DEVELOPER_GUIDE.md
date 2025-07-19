# Developer Guide

This guide walks through the process of adding new features to the CloneDex application, following the established patterns and best practices.

## Table of Contents

1. [Adding a New Feature](#adding-a-new-feature)
2. [Database Schema Changes](#database-schema-changes)
3. [API Route Development](#api-route-development)
4. [State Management](#state-management)
5. [Real-time Features](#real-time-features)
6. [UI Components](#ui-components)
7. [Testing Strategy](#testing-strategy)
8. [Performance Optimization](#performance-optimization)

## Adding a New Feature

Let's walk through adding a "Projects" feature as an example.

### Step 1: Define the Database Schema

First, add the schema to `/db/schema.ts`:

```typescript
// db/schema.ts
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["planning", "active", "completed", "archived"],
  })
    .notNull()
    .default("planning"),
  visibility: text("visibility", {
    enum: ["private", "public", "team"],
  })
    .notNull()
    .default("private"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  environmentId: text("environment_id").references(() => environments.id),
  metadata: jsonb("metadata").$type<ProjectMetadata>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Define TypeScript types
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

// Create indexes for performance
export const projectsIndexes = [
  index("projects_user_id_idx").on(projects.userId),
  index("projects_status_idx").on(projects.status),
  index("projects_created_at_idx").on(projects.createdAt.desc()),
];
```

### Step 2: Generate and Run Migrations

```bash
# Generate migration files
bun run db:generate

# Review the generated SQL
cat db/migrations/[timestamp]_add_projects.sql

# Run migrations
bun run db:migrate
```

### Step 3: Create API Routes

Create `/app/api/projects/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { db } from "@/db/config";
import { projects } from "@/db/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { ulid } from "ulid";
import { observability } from "@/lib/observability";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
  createPaginatedResponse,
} from "@/src/schemas/api-routes";

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["planning", "active", "completed", "archived"])
    .default("planning"),
  visibility: z.enum(["private", "public", "team"]).default("private"),
  userId: z.string().ulid(),
  environmentId: z.string().ulid().optional(),
  metadata: z.record(z.any()).optional(),
});

const GetProjectsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

// Service class for business logic
class ProjectsService {
  static async getProjects(params: z.infer<typeof GetProjectsQuerySchema>) {
    const tracer = trace.getTracer("projects-api");
    const span = tracer.startSpan("projects.getProjects");

    try {
      const startTime = Date.now();

      // Build query conditions
      const conditions = [];
      if (params.userId) conditions.push(eq(projects.userId, params.userId));
      if (params.status) conditions.push(eq(projects.status, params.status));
      if (params.search)
        conditions.push(like(projects.name, `%${params.search}%`));

      // Execute query
      const offset = (params.page - 1) * params.limit;
      const [results, [{ count }]] = await Promise.all([
        db
          .select()
          .from(projects)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(projects.createdAt))
          .limit(params.limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(projects)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      const duration = Date.now() - startTime;
      observability.metrics.queryDuration(duration, "select_projects", true);

      span.setAttributes({
        "projects.count": results.length,
        "projects.total": Number(count),
        "query.duration": duration,
      });

      return {
        projects: results,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / params.limit),
        },
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  static async createProject(data: z.infer<typeof CreateProjectSchema>) {
    const newProject = {
      id: ulid(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(projects).values(newProject).returning();

    // Record metrics
    observability.metrics.increment("projects.created");

    return created;
  }
}

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = GetProjectsQuerySchema.parse(
      Object.fromEntries(searchParams),
    );

    const result = await ProjectsService.getProjects(params);

    return NextResponse.json(
      createPaginatedResponse(
        result.projects,
        result.pagination,
        "Projects retrieved successfully",
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse(
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          error.errors,
        ),
        { status: 400 },
      );
    }

    return NextResponse.json(
      createApiErrorResponse("Internal server error", 500, "INTERNAL_ERROR"),
      { status: 500 },
    );
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateProjectSchema.parse(body);

    const project = await ProjectsService.createProject(validated);

    return NextResponse.json(
      createApiSuccessResponse(project, "Project created successfully"),
      { status: 201 },
    );
  } catch (error) {
    // Error handling...
  }
}
```

### Step 4: Create TanStack Query Hooks

Create `/hooks/use-project-queries.ts`:

```typescript
import { useMemo } from "react";
import {
  useEnhancedQuery,
  useEnhancedMutation,
} from "@/components/providers/query-provider";
import { useElectricProjects } from "@/hooks/use-electric-projects";
import { observability } from "@/lib/observability";

// Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "planning" | "active" | "completed" | "archived";
  visibility: "private" | "public" | "team";
  userId: string;
  environmentId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Query keys factory
export const projectQueryKeys = {
  all: ["projects"] as const,
  lists: () => [...projectQueryKeys.all, "list"] as const,
  list: (filters: any) => [...projectQueryKeys.lists(), filters] as const,
  details: () => [...projectQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...projectQueryKeys.details(), id] as const,
};

// Hook for querying projects
export function useProjectsQuery(filters: ProjectFilters = {}) {
  // Use ElectricSQL for real-time data
  const { projects: electricProjects, loading: electricLoading } =
    useElectricProjects(filters);

  // API query with fallback
  const { data: apiProjects, ...queryState } = useEnhancedQuery(
    projectQueryKeys.list(filters),
    async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });

      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) throw new Error("Failed to fetch projects");

      const result = await response.json();
      return result.data || [];
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      enableWASMOptimization: true,
    },
  );

  // Combine data sources
  const projects = useMemo(() => {
    return electricProjects?.length > 0 ? electricProjects : apiProjects || [];
  }, [electricProjects, apiProjects]);

  return {
    projects,
    loading: electricLoading || queryState.loading,
    ...queryState,
  };
}

// Hook for creating projects
export function useCreateProjectMutation() {
  return useEnhancedMutation(
    async (projectData: CreateProjectData) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }

      return response.json();
    },
    {
      optimisticUpdate: (variables) => {
        // Create optimistic project
        const optimisticProject: Project = {
          id: `temp-${Date.now()}`,
          ...variables,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update cache immediately
        queryClient.setQueryData(
          projectQueryKeys.lists(),
          (old: Project[] = []) => [optimisticProject, ...old],
        );

        return { optimisticProject };
      },
      rollbackUpdate: (context) => {
        // Remove optimistic project on error
        if (context?.optimisticProject) {
          queryClient.setQueryData(
            projectQueryKeys.lists(),
            (old: Project[] = []) =>
              old.filter((p) => p.id !== context.optimisticProject.id),
          );
        }
      },
      invalidateQueries: [projectQueryKeys.all],
    },
  );
}
```

### Step 5: Add ElectricSQL Integration

Create `/hooks/use-electric-projects.ts`:

```typescript
import { useEffect, useState } from "react";
import { electricClient } from "@/lib/electric/client";
import type { Project } from "@/db/schema";

export function useElectricProjects(filters?: ProjectFilters) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      try {
        // Initialize ElectricSQL if needed
        await electricClient.initialize();

        // Subscribe to projects table
        unsubscribe = electricClient.subscribe<Project>(
          "projects",
          (data) => {
            // Apply client-side filtering if needed
            let filtered = data;
            if (filters?.userId) {
              filtered = filtered.filter((p) => p.userId === filters.userId);
            }
            if (filters?.status) {
              filtered = filtered.filter((p) => p.status === filters.status);
            }

            setProjects(filtered);
            setLoading(false);
          },
          {
            where: filters?.userId ? { userId: filters.userId } : undefined,
            orderBy: { createdAt: "desc" },
          },
        );
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [filters?.userId, filters?.status]);

  return { projects, loading, error };
}
```

### Step 6: Create UI Components

Create `/components/projects/project-list.tsx`:

```typescript
'use client'

import { useProjectsQuery } from '@/hooks/use-project-queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

export function ProjectList({ userId }: { userId?: string }) {
  const { projects, loading, error } = useProjectsQuery({ userId })

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-4 text-center text-red-500">
        Failed to load projects: {error.message}
      </Card>
    )
  }

  if (!projects.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No projects yet. Create your first project!
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {project.description}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <Badge variant={getStatusVariant(project.status)}>
                  {project.status}
                </Badge>
                <Badge variant="outline">
                  {project.visibility}
                </Badge>
              </div>
            </div>
            <time className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
            </time>
          </div>
        </Card>
      ))}
    </div>
  )
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active': return 'default'
    case 'completed': return 'success'
    case 'archived': return 'secondary'
    default: return 'outline'
  }
}
```

### Step 7: Add Tests

Create `/tests/integration/projects.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/config";
import { projects } from "@/db/schema";
import { ProjectsService } from "@/app/api/projects/service";

describe("Projects API", () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(projects);
  });

  describe("GET /api/projects", () => {
    it("should return paginated projects", async () => {
      // Create test data
      const testProjects = Array.from({ length: 25 }, (_, i) => ({
        id: `test-${i}`,
        name: `Project ${i}`,
        status: "active" as const,
        visibility: "private" as const,
        userId: "test-user",
      }));

      await db.insert(projects).values(testProjects);

      // Test pagination
      const result = await ProjectsService.getProjects({
        page: 1,
        limit: 10,
        userId: "test-user",
      });

      expect(result.projects).toHaveLength(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });

    it("should filter by status", async () => {
      // Create projects with different statuses
      await db.insert(projects).values([
        { name: "Active Project", status: "active", userId: "test-user" },
        { name: "Completed Project", status: "completed", userId: "test-user" },
        { name: "Planning Project", status: "planning", userId: "test-user" },
      ]);

      const result = await ProjectsService.getProjects({
        page: 1,
        limit: 10,
        status: "active",
      });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe("Active Project");
    });
  });

  describe("POST /api/projects", () => {
    it("should create a new project", async () => {
      const projectData = {
        name: "Test Project",
        description: "Test description",
        status: "planning" as const,
        visibility: "private" as const,
        userId: "test-user",
      };

      const created = await ProjectsService.createProject(projectData);

      expect(created).toMatchObject(projectData);
      expect(created.id).toBeDefined();
      expect(created.createdAt).toBeInstanceOf(Date);

      // Verify in database
      const [dbProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, created.id));

      expect(dbProject).toBeDefined();
      expect(dbProject.name).toBe(projectData.name);
    });
  });
});
```

## Database Schema Changes

### Best Practices

1. **Always use migrations**
   - Never modify schema directly in production
   - Test migrations in development first
   - Keep migrations small and focused

2. **Schema design principles**
   - Use ULIDs for primary keys
   - Always include `createdAt` and `updatedAt`
   - Add appropriate indexes for query patterns
   - Use enums for constrained values

3. **Migration workflow**

   ```bash
   # 1. Modify schema
   # 2. Generate migration
   bun run db:generate

   # 3. Review generated SQL
   # 4. Test migration locally
   bun run db:migrate

   # 5. Test rollback
   bun run db:rollback

   # 6. Re-apply and test application
   ```

## API Route Development

### Standard Pattern

All API routes should follow this structure:

1. **Input validation** with Zod
2. **Service layer** for business logic
3. **Observability** with OpenTelemetry
4. **Consistent error handling**
5. **Structured responses**

### Error Handling

```typescript
// Custom error class
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: any,
  ) {
    super(message);
  }
}

// Usage in routes
if (!authorized) {
  throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
}
```

### Response Format

```typescript
// Success response
{
  success: true,
  data: T,
  message: string,
  timestamp: string
}

// Error response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  },
  timestamp: string
}

// Paginated response
{
  success: true,
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  message: string,
  timestamp: string
}
```

## State Management

### TanStack Query Patterns

1. **Query Keys Factory**

   ```typescript
   export const resourceQueryKeys = {
     all: ["resource"] as const,
     lists: () => [...resourceQueryKeys.all, "list"] as const,
     list: (filters) => [...resourceQueryKeys.lists(), filters] as const,
     details: () => [...resourceQueryKeys.all, "detail"] as const,
     detail: (id) => [...resourceQueryKeys.details(), id] as const,
   };
   ```

2. **Optimistic Updates**
   - Update UI immediately
   - Rollback on error
   - Invalidate related queries

3. **Background Refetching**
   - Configure stale times appropriately
   - Use focus/reconnect refetching
   - Implement proper error boundaries

## Real-time Features

### ElectricSQL Integration

1. **Subscribe to tables**

   ```typescript
   const unsubscribe = electricClient.subscribe(
     "table_name",
     (data) => {
       // Handle real-time updates
     },
     { where: conditions },
   );
   ```

2. **Handle offline scenarios**
   - Queue operations when offline
   - Sync when connection restored
   - Show sync status to users

3. **Conflict resolution**
   - Default: last-write-wins
   - Custom resolution for critical data
   - Log conflicts for debugging

## UI Components

### Component Structure

```
components/
├── ui/                    # Base UI components (shadcn/ui)
├── features/             # Feature-specific components
│   ├── projects/
│   │   ├── project-list.tsx
│   │   ├── project-form.tsx
│   │   └── project-card.tsx
│   └── tasks/
└── shared/               # Shared components
```

### Component Guidelines

1. **Use composition**
   - Small, focused components
   - Compose for complex UIs
   - Extract reusable parts

2. **Accessibility**
   - Proper ARIA labels
   - Keyboard navigation
   - Screen reader support

3. **Performance**
   - Memo expensive components
   - Lazy load when appropriate
   - Virtualize long lists

## Testing Strategy

### Test Pyramid

1. **Unit Tests** (60%)
   - Component logic
   - Utility functions
   - Hooks

2. **Integration Tests** (30%)
   - API routes
   - Database operations
   - Service interactions

3. **E2E Tests** (10%)
   - Critical user flows
   - Cross-browser testing
   - Visual regression

### Test Patterns

```typescript
// Component test
describe('ProjectList', () => {
  it('renders projects correctly', () => {
    const { getByText } = render(
      <ProjectList projects={mockProjects} />
    )
    expect(getByText('Project 1')).toBeInTheDocument()
  })
})

// Hook test
describe('useProjectsQuery', () => {
  it('fetches projects successfully', async () => {
    const { result } = renderHook(() => useProjectsQuery())
    await waitFor(() => {
      expect(result.current.projects).toHaveLength(3)
    })
  })
})

// API test
describe('POST /api/projects', () => {
  it('creates project with valid data', async () => {
    const response = await POST(createMockRequest({
      name: 'Test'
    }))
    expect(response.status).toBe(201)
  })
})
```

## Performance Optimization

### Database Performance

1. **Indexing Strategy**
   - Index foreign keys
   - Index commonly queried fields
   - Composite indexes for complex queries

2. **Query Optimization**
   - Use appropriate SELECT fields
   - Batch operations when possible
   - Monitor slow queries

### Frontend Performance

1. **Code Splitting**
   - Route-based splitting
   - Component lazy loading
   - Dynamic imports

2. **Caching Strategy**
   - TanStack Query caching
   - Static asset caching
   - API response caching

3. **WASM Optimization**
   - Use for compute-intensive tasks
   - Vector search operations
   - Large data processing

### Monitoring

1. **Performance Metrics**
   - Core Web Vitals
   - API response times
   - Database query duration

2. **Error Tracking**
   - Client-side errors
   - API errors
   - Background job failures

3. **User Analytics**
   - Feature usage
   - Performance by region
   - Error rates by browser

## Best Practices Summary

1. **Code Organization**
   - Follow established patterns
   - Keep files focused
   - Use consistent naming

2. **Type Safety**
   - Define all types
   - Use Zod for runtime validation
   - Avoid `any` types

3. **Error Handling**
   - Always handle errors explicitly
   - Provide useful error messages
   - Log errors for debugging

4. **Documentation**
   - Document complex logic
   - Keep README updated
   - Write clear commit messages

5. **Security**
   - Validate all inputs
   - Use parameterized queries
   - Implement proper auth checks

6. **Performance**
   - Measure before optimizing
   - Use appropriate caching
   - Monitor production metrics
