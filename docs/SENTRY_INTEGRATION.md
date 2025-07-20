# Sentry Integration Guide

This guide covers the comprehensive Sentry integration implemented in the project, including error tracking, performance monitoring, and logging.

## Overview

Our Sentry integration provides:

- **Error Tracking**: Automatic capture of client and server-side errors
- **Performance Monitoring**: Custom spans for API routes, database operations, and user interactions
- **Release Tracking**: Source map uploads for better stack traces
- **User Context**: Automatic user session tracking
- **Custom Metrics**: Business metrics and KPIs
- **Integration**: Seamless integration with existing OpenTelemetry observability

## Configuration

### Environment Variables

Add these environment variables to your `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Getting Sentry Credentials

1. **Create a Sentry account** at [sentry.io](https://sentry.io)
2. **Create a new project** and select "Next.js"
3. **Get your DSN** from the project settings
4. **Create an auth token** in Organization Settings > Auth Tokens
5. **Note your organization and project names**

## Features

### 1. Error Boundaries

Global error handling with automatic Sentry reporting:

```tsx
// app/global-error.tsx - Catches unhandled errors
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  // ... UI for error display
}

// components/providers/error-boundary.tsx - Component-level error boundary
export class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    Sentry.withScope((scope) => {
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
      })
      Sentry.captureException(error)
    })
  }
}
```

### 2. Performance Monitoring

#### API Routes

```typescript
import { instrumentApiRoute } from '@/lib/sentry/instrumentation'

export async function POST(request: NextRequest) {
  return instrumentApiRoute('POST', '/api/tasks', async () => {
    // Your API logic here
    const tasks = await TasksService.getTasks()
    return NextResponse.json(tasks)
  })
}
```

#### Database Operations

```typescript
import { instrumentDatabaseOperation } from '@/lib/sentry/instrumentation'

async function getUserTasks(userId: string) {
  return instrumentDatabaseOperation(
    'select',
    'SELECT * FROM tasks WHERE userId = ?',
    async () => {
      return await db.select().from(tasks).where(eq(tasks.userId, userId))
    }
  )
}
```

#### Server Actions

```typescript
import { instrumentServerAction } from '@/lib/sentry/instrumentation'

export async function createTask(formData: FormData) {
  return instrumentServerAction('createTask', async () => {
    // Your server action logic
    const task = await TasksService.create(formData)
    return task
  })
}
```

### 3. Component Instrumentation

```tsx
import { useSentryAction, withSentryInstrumentation } from '@/components/sentry/SentryInstrumentation'

function TaskComponent() {
  const trackAction = useSentryAction('task.button.click')

  const handleClick = trackAction(async () => {
    // This action will be tracked in Sentry
    await processTask()
  })

  return <button onClick={handleClick}>Process Task</button>
}

// Export with HOC for automatic instrumentation
export default withSentryInstrumentation(TaskComponent, 'TaskComponent')
```

### 4. Custom Spans

```typescript
import * as Sentry from '@sentry/nextjs'

function processComplexOperation() {
  return Sentry.startSpan(
    {
      op: 'task.process',
      name: 'Complex Task Processing',
    },
    async (span) => {
      // Add custom data
      span?.setData('operation.type', 'complex')
      span?.setData('user.id', userId)
      
      // Your operation here
      const result = await complexOperation()
      
      span?.setData('result.count', result.length)
      return result
    }
  )
}
```

### 5. Enhanced Observability

The enhanced observability service integrates Sentry with existing OpenTelemetry:

```typescript
import { enhancedObservability } from '@/lib/observability/enhanced'

// Track custom metrics
enhancedObservability.trackMetric('api.response.time', 250, 'millisecond', {
  endpoint: '/api/tasks'
})

// Log events to both systems
await enhancedObservability.logEvent(
  'info',
  'Task created successfully',
  { taskId: '123', userId: 'user456' },
  'TaskService'
)

// Set user context
enhancedObservability.setUser({
  id: 'user123',
  email: 'user@example.com'
})
```

### 6. Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry/instrumentation'

// Add navigation breadcrumb
addBreadcrumb('User navigated to dashboard', 'navigation', 'info', {
  from: '/login',
  to: '/dashboard'
})

// Add user action breadcrumb
addBreadcrumb('Task filter applied', 'user', 'info', {
  filter: 'completed',
  count: 15
})
```

## Usage Examples

### Complete API Route Example

```typescript
// app/api/tasks/route.ts
import { instrumentApiRoute } from '@/lib/sentry/instrumentation'
import { enhancedObservability } from '@/lib/observability/enhanced'

const logger = enhancedObservability.getLogger('api.tasks')

export async function GET(request: NextRequest) {
  return instrumentApiRoute('GET', '/api/tasks', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')

      // Set user context
      if (userId) {
        enhancedObservability.setUser({ id: userId })
      }

      // Log the request
      logger.info('Fetching tasks', { userId })

      // Fetch tasks with database instrumentation
      const tasks = await instrumentDatabaseOperation(
        'select',
        'SELECT * FROM tasks WHERE userId = ?',
        () => TasksService.getTasks(userId)
      )

      // Track metric
      enhancedObservability.trackIncrement('api.tasks.fetch.success', 1, {
        userId: userId || 'anonymous'
      })

      return NextResponse.json({ tasks })
    } catch (error) {
      logger.error('Failed to fetch tasks', error, { userId })
      throw error
    }
  })
}
```

### Complete Component Example

```tsx
// components/TaskList.tsx
import { useSentryAction, withSentryInstrumentation } from '@/components/sentry/SentryInstrumentation'
import { enhancedObservability } from '@/lib/observability/enhanced'

function TaskList({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState([])
  const trackAction = useSentryAction('task.load')
  
  const logger = enhancedObservability.getLogger('TaskList')

  const loadTasks = trackAction(async () => {
    try {
      logger.info('Loading tasks', { userId })
      
      const response = await fetch(`/api/tasks?userId=${userId}`)
      const data = await response.json()
      
      setTasks(data.tasks)
      
      // Track success
      enhancedObservability.trackIncrement('ui.tasks.load.success', 1, {
        userId,
        count: data.tasks.length
      })
    } catch (error) {
      logger.error('Failed to load tasks', error, { userId })
      throw error
    }
  })

  useEffect(() => {
    loadTasks()
  }, [userId])

  return (
    <div>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}

export default withSentryInstrumentation(TaskList, 'TaskList')
```

## Configuration Options

### Client Configuration (sentry.client.config.ts)

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    Sentry.replayIntegration(),
  ],
  
  _experiments: {
    enableLogs: true,
  },
})
```

### Server Configuration (sentry.server.config.ts)

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['error', 'warn', 'info'] }),
  ],
  
  _experiments: {
    enableLogs: true,
  },
})
```

## Testing

Run the Sentry integration tests:

```bash
# Unit tests for Sentry integration
bun test tests/sentry/

# Test specific functionality
bun test tests/sentry/sentry-integration.test.ts
bun test tests/sentry/enhanced-observability.test.ts
```

## Production Deployment

### Build Configuration

The Next.js config automatically handles:

- Source map uploads during build
- Error boundary integration
- Performance monitoring setup

### Environment Setup

For production, ensure these environment variables are set:

```bash
NODE_ENV=production
NEXT_PUBLIC_SENTRY_DSN=your-production-dsn
SENTRY_DSN=your-production-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### Release Tracking

Releases are automatically created during builds with:

- Version from package.json
- Git commit SHA
- Source map uploads
- Deploy notifications

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Error Rate**: Percentage of requests resulting in errors
2. **Response Time**: P95 response times for API routes
3. **User Sessions**: Active user sessions and engagement
4. **Database Performance**: Query execution times
5. **Custom Business Metrics**: Task completion rates, user actions

### Recommended Alerts

Set up alerts in Sentry for:

- Error rate > 5% over 5 minutes
- P95 response time > 2 seconds
- New error types detected
- Performance regression detected

## Troubleshooting

### Common Issues

1. **DSN not set**: Ensure `NEXT_PUBLIC_SENTRY_DSN` is configured
2. **Source maps not uploading**: Check `SENTRY_AUTH_TOKEN` permissions
3. **Too many events**: Adjust sample rates in configuration
4. **Missing user context**: Ensure `setUser` is called after authentication

### Debug Mode

Enable debug logging in development:

```typescript
Sentry.init({
  debug: true, // Only in development
  // ... other config
})
```

### Verification

Test your integration:

```bash
# Trigger a test error
curl -X POST http://localhost:3000/api/test-error

# Check Sentry dashboard for:
# - Error events
# - Performance transactions
# - User sessions
# - Custom metrics
```

## Best Practices

1. **Set User Context Early**: Call `setUser` after authentication
2. **Use Meaningful Span Names**: Make spans descriptive and searchable
3. **Add Relevant Tags**: Tag errors with component, feature, user role
4. **Monitor Performance**: Track key user journeys and API endpoints
5. **Custom Metrics**: Track business KPIs alongside technical metrics
6. **Error Grouping**: Use fingerprinting for better error organization

## Integration with Existing Systems

This Sentry integration works alongside:

- **OpenTelemetry**: Dual instrumentation for comprehensive coverage
- **Winston Logging**: Enhanced logger sends to both systems
- **Prometheus/Grafana**: Metrics are sent to both monitoring stacks
- **Database Monitoring**: Query performance tracked in both systems

The integration is designed to complement, not replace, existing observability tools.