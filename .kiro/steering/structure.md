# Project Structure & Organization

## Directory Layout

```
codex-clone/
├── app/                    # Next.js App Router (pages & API routes)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Core business logic & utilities
├── db/                     # Database schema & migrations
├── stores/                 # Zustand state management
├── types/                  # TypeScript type definitions
├── tests/                  # Test suites (unit, integration, e2e)
├── scripts/                # CLI tools & automation
├── docs/                   # Documentation
└── src/                    # Alternative organization (features-based)
```

## Key Conventions

### File Naming
- **Components**: PascalCase (`TaskList.tsx`, `UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useTaskQueries.ts`)
- **Utilities**: camelCase (`utils.ts`, `auth-helpers.ts`)
- **Types**: camelCase with descriptive names (`task.ts`, `environment.ts`)
- **Tests**: Match source file with `.test.ts` suffix

### Import Paths
Use TypeScript path aliases defined in `tsconfig.json`:
```typescript
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/task'
```

### Component Organization
```
components/
├── ui/                     # Base UI primitives (shadcn/ui)
├── forms/                  # Form-specific components
├── navigation/             # Navigation components
├── providers/              # React context providers
├── auth/                   # Authentication components
├── agents/                 # AI agent interfaces
└── observability/          # Monitoring & debugging UI
```

### Library Structure
```
lib/
├── auth/                   # Authentication services
├── electric/               # ElectricSQL client & sync
├── ai/                     # AI model integrations
├── observability/          # Monitoring & tracing
├── migration/              # Data migration system
├── wasm/                   # WebAssembly modules
├── utils.ts                # Shared utilities
└── env.ts                  # Environment configuration
```

### Database Organization
```
db/
├── schema.ts               # Drizzle ORM schema definitions
├── config.ts               # Database configuration
├── validation.ts           # Schema validation
├── cli.ts                  # Database CLI tool
└── migrations/             # SQL migration files
```

## Architecture Patterns

### Component Patterns
- **Compound Components**: For complex UI with multiple parts
- **Render Props**: For logic sharing between components
- **Custom Hooks**: Extract stateful logic from components
- **Error Boundaries**: Graceful error handling at component level

### State Management
- **TanStack Query**: Server state with caching and synchronization
- **Zustand**: Client-side state for UI and temporary data
- **ElectricSQL**: Real-time database synchronization
- **React Context**: Component-level state sharing

### API Organization
```
app/api/
├── auth/                   # Authentication endpoints
├── agents/                 # AI agent endpoints
├── tasks/                  # Task management
├── environments/           # Environment management
├── inngest/                # Background job handlers
└── migration/              # Data migration endpoints
```

### Testing Structure
```
tests/
├── unit/                   # Unit tests (lib, utils, schemas)
├── integration/            # Integration tests (components, hooks)
├── e2e/                    # End-to-end tests (Playwright)
├── fixtures/               # Test data and mocks
├── mocks/                  # Mock implementations
└── setup/                  # Test configuration
```

## Code Style Guidelines

### TypeScript
- Use strict mode with `strictNullChecks: true`
- Prefer `type` over `interface` for object shapes
- Use explicit return types for public functions
- Leverage discriminated unions for state management

### React Components
- Use function components with hooks
- Prefer composition over inheritance
- Extract custom hooks for complex logic
- Use `forwardRef` for component library elements

### Database Schema
- Use UUID primary keys (`uuid().primaryKey().defaultRandom()`)
- Include `createdAt` and `updatedAt` timestamps
- Add appropriate indexes for query performance
- Use JSONB for flexible metadata storage

### Error Handling
- Use Result types or explicit error boundaries
- Log errors with structured data
- Provide user-friendly error messages
- Include correlation IDs for tracing

## Development Workflow

### Feature Development
1. Create feature branch from `main`
2. Implement with tests (TDD approach)
3. Run quality checks (`bun run quality`)
4. Submit PR with comprehensive description

### Database Changes
1. Generate migration (`bun run db:generate`)
2. Review generated SQL
3. Test migration locally
4. Include rollback strategy

### Component Development
1. Start with Storybook story
2. Implement component with TypeScript
3. Add unit tests
4. Document props and usage