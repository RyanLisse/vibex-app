# Technology Stack

## Runtime & Package Management
- **Bun**: Primary runtime and package manager (v1.0+)
- **Node.js**: Compatibility layer (v18+)

## Frontend Stack
- **Next.js 15**: React framework with App Router
- **React 19**: UI library with concurrent features
- **TypeScript**: Strict type checking enabled
- **Tailwind CSS v4**: Utility-first styling with custom configuration
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library

## Backend & Database
- **PostgreSQL 14+**: Primary database with vector search support
- **ElectricSQL**: Real-time sync with offline-first architecture
- **Drizzle ORM**: Type-safe SQL queries with migrations
- **Redis**: Caching and session storage (optional)
- **PGlite**: Embedded PostgreSQL for offline support

## AI & Background Processing
- **OpenAI API**: Primary LLM integration
- **Anthropic API**: Secondary AI provider
- **Letta**: Multi-agent system orchestration
- **Inngest**: Background job processing with real-time updates
- **E2B**: Sandboxed code execution environments

## Development Tools
- **Biome**: Code formatting and linting (replaces ESLint/Prettier)
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **Storybook**: Component development and documentation
- **Husky**: Git hooks for quality gates

## Common Commands

### Development
```bash
# Start all services (recommended)
bun run dev:all

# Development server only
bun run dev

# Type checking
bun run typecheck
```

### Testing
```bash
# Run all tests
bun run test

# Unit tests only
bun run test:unit

# Integration tests
bun run test:integration

# E2E tests
bun run test:e2e

# Test coverage
bun run test:coverage
```

### Database
```bash
# Run migrations
bun run db:migrate

# Database studio
bun run db:studio

# Generate migrations
bun run db:generate

# Database health check
bun run db:health
```

### Code Quality
```bash
# Format and lint
bun run check:fix

# Type check
bun run typecheck

# Full quality check
bun run quality
```

### Build & Deploy
```bash
# Production build
bun run build

# Start production server
bun run start

# Bundle analysis
bun run analyze
```

## Key Configuration Files
- `package.json`: Scripts and dependencies
- `next.config.ts`: Next.js configuration
- `tsconfig.json`: TypeScript configuration with strict settings
- `biome.json`: Code formatting and linting rules
- `drizzle.config.ts`: Database ORM configuration
- `vitest.config.ts`: Test configuration