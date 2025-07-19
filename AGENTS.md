# Remote Cloud Agent Configuration

This file provides configuration and guidance for cloud-based coding agents working on the Codex-Clone project.

## 🔧 Project Overview

**Codex-Clone** is a modern AI-powered code generation platform featuring:

- Next.js 15 + TypeScript + Bun runtime
- ElectricSQL for real-time data synchronization
- Winston logging system with correlation tracking
- Comprehensive testing framework (Vitest + Playwright)
- WASM modules for high-performance computing
- Multi-agent AI system with Letta and Inngest integration

## 🚀 Quick Start Commands

### Essential Development Commands

```bash
# Install dependencies
bun install

# Start development server with all services
bun run dev:all

# Run tests
bun run test

# Type checking and linting
bun run type-check && bun run lint

# Database operations
bun run db:migrate
bun run db:studio
```

### Testing Commands

```bash
# Run specific test suites
bun run test:unit:logic        # Core logic tests
bun run test:integration       # Integration tests
bun run test:e2e              # End-to-end tests
bun run test:coverage         # Coverage report

# Test specific areas
bun run test:inngest          # Inngest background jobs
bun run test:browser          # Browser-based tests
```

### Database & Migration Commands

```bash
# Database management
bun run db:status             # Check migration status
bun run db:health             # Database connectivity check
bun run db:generate           # Generate migration files

# Data migration system
bun run migration:status      # Migration system status
bun run migration:migrate     # Run data migrations
bun run migration:backup      # Create backup
```

### Quality & Performance Commands

```bash
# Code quality
bun run quality              # Full quality check pipeline
bun run format               # Format code with Biome
bun run security             # Security audit

# Performance monitoring
bun run monitor:performance  # Performance monitoring
bun run bundle:analyze       # Bundle size analysis
```

## 📁 Project Structure

### Core Directories

```
app/                    # Next.js App Router
├── actions/           # Server actions
├── api/              # API routes & endpoints
└── task/[id]/        # Task management pages

components/            # Reusable UI components
├── ui/               # shadcn/ui components
├── auth/             # Authentication components
└── providers/        # React context providers

lib/                   # Core libraries & utilities
├── electric/         # ElectricSQL client
├── logging/          # Winston logging system
├── auth/             # Authentication logic
├── inngest.ts        # Background job processing
└── wasm/             # WebAssembly modules

hooks/                 # Custom React hooks
tests/                 # Test suites
├── unit/             # Unit tests
├── integration/      # Integration tests
└── e2e/              # End-to-end tests
```

### Key Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.*.config.ts` - Test configurations
- `next.config.ts` - Next.js configuration
- `.env.example` - Environment variable template

## 🛠️ Development Workflow

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Required environment variables:
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
ELECTRIC_URL=postgresql://...
```

### 2. Before Making Changes

```bash
# Always check current status
git status
bun run type-check
bun run test

# Ensure database is ready
bun run db:health
```

### 3. Making Changes

- **Components**: Follow existing patterns in `components/`
- **API Routes**: Use established patterns in `app/api/`
- **Tests**: Write tests alongside implementation
- **Types**: Update TypeScript interfaces as needed

### 4. Quality Checks

```bash
# Required before commits
bun run lint:fix
bun run type-check
bun run test
```

## 🧪 Testing Strategy

### Test Categories

1. **Unit Tests** (`bun run test:unit:logic`)
   - Pure functions and utilities
   - Component logic testing
   - Individual hook testing

2. **Component Tests** (`bun run test:unit:components`)
   - React component rendering
   - User interaction testing
   - Props validation

3. **Integration Tests** (`bun run test:integration`)
   - API endpoint testing
   - Database integration
   - Service interaction

4. **E2E Tests** (`bun run test:e2e`)
   - Full user workflows
   - Browser automation with Playwright
   - Cross-browser compatibility

### Testing Best Practices

- Write tests alongside implementation
- Use descriptive test names
- Mock external dependencies
- Test error conditions
- Maintain high coverage (>80%)

## 🗄️ Database & State Management

### ElectricSQL Integration

```bash
# Check sync status
bun run db:health

# Monitor real-time sync
# Check browser console for sync logs
```

### State Management Patterns

- **TanStack Query** for server state
- **Zustand** for client state
- **ElectricSQL** for real-time data
- **Optimistic updates** for UI responsiveness

## 📊 Logging & Observability

### Winston Logging System

The project includes a comprehensive logging system:

```typescript
// Import logger
import { LoggerFactory } from "@/lib/logging";

// Use in components/API routes
const logger = LoggerFactory.getInstance().createLogger("component-name");
logger.info("Operation completed", { metadata });
```

### Log Categories

- **API requests/responses** - Automatic via middleware
- **Database operations** - Query logging with performance metrics
- **AI agent operations** - LLM requests and responses
- **Error tracking** - Comprehensive error context
- **Performance metrics** - Operation timing and bottlenecks

### Correlation IDs

All requests include correlation IDs for tracing across services.

## 🤖 AI Agent Integration

### Letta Agent System

```bash
# Test agent functionality
bun run demo:voice-brainstorm

# Agent development scripts
bun run scripts/demo-voice-brainstorm.ts
```

### Agent Types

- **Brainstorm Agent** - Creative ideation and problem-solving
- **Code Generation Agent** - Automated code creation
- **Orchestrator Agent** - Multi-agent coordination

## 🔧 Common Issues & Solutions

### TypeScript Errors

```bash
# Fix common TypeScript issues
bun run fix:typescript

# Regenerate types
bun run db:generate
```

### Test Failures

```bash
# Fix test configuration issues
bun run fix:vitest

# Run specific test file
bun test path/to/test.ts
```

### Database Issues

```bash
# Reset database
bun run db:rollback
bun run db:migrate

# Check connection
bun run db:health
```

### Performance Issues

```bash
# Analyze bundle size
bun run bundle:analyze

# Monitor performance
bun run monitor:performance
```

## 🚨 Critical Guidelines

### Security

- **Never commit secrets** - Use environment variables
- **Validate all inputs** - Use Zod schemas
- **Sanitize user data** - Prevent XSS/injection
- **Use parameterized queries** - Prevent SQL injection

### Code Quality

- **Follow TypeScript strict mode** - No `any` types
- **Write comprehensive tests** - Unit + Integration + E2E
- **Use proper error handling** - Try/catch with logging
- **Document complex logic** - Clear comments for algorithms

### Performance

- **Optimize database queries** - Use indexes and monitoring
- **Implement proper caching** - Redis and TanStack Query
- **Use WASM for heavy computation** - Leverage existing modules
- **Monitor bundle size** - Keep client bundles optimized

## 📚 Key Dependencies

### Core Framework

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and development experience
- **Bun** - Fast JavaScript runtime and package manager

### Database & State

- **PostgreSQL** - Primary database
- **ElectricSQL** - Real-time sync and offline support
- **Drizzle ORM** - Type-safe database operations
- **TanStack Query** - Server state management

### UI & Styling

- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library

### Testing & Quality

- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **Biome** - Code formatting and linting
- **Storybook** - Component development

### AI & Background Jobs

- **OpenAI SDK** - AI model integration
- **Inngest** - Background job processing
- **Letta** - Multi-agent system

## 🎯 Development Priorities

### High Priority

1. **Maintain test coverage** - All new code must include tests
2. **Database performance** - Monitor and optimize queries
3. **Type safety** - Eliminate any TypeScript errors
4. **Security** - Follow secure coding practices

### Medium Priority

1. **Documentation** - Keep README and guides updated
2. **Performance optimization** - Bundle size and runtime performance
3. **Code quality** - Refactor legacy code patterns
4. **Monitoring** - Improve observability and logging

### Low Priority

1. **Feature enhancements** - New functionality
2. **UI/UX improvements** - Design system refinements
3. **Developer experience** - Tooling and automation
4. **Documentation** - Comprehensive API docs

## 📞 Support & Resources

### Documentation

- `README.md` - Project overview and setup
- `docs/` - Detailed technical documentation
- Individual component READMEs in feature directories

### Debugging

```bash
# Enable debug logging
DEBUG=* bun run dev

# Check specific modules
DEBUG=electric:*,migration:* bun run dev
```

### Getting Help

- **Architecture docs** - See `docs/ARCHITECTURE.md`
- **Testing guide** - See `docs/TESTING_GUIDE.md`
- **Migration guide** - See `docs/MIGRATION_GUIDE.md`
- **GitHub Issues** - Report bugs and feature requests

---

**Last Updated**: 2025-01-19
**Project Version**: 0.1.0
**Node Version**: 18+
**Bun Version**: 1.0+
