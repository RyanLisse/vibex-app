# Architecture Overview

This document outlines the system architecture of the Codex-Clone platform.

## 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   Next.js 15    │◄──►│   API Routes    │◄──►│   PostgreSQL    │
│   React 19      │    │   Server Actions│    │   + ElectricSQL │
│   TypeScript    │    │   Middleware    │    │   + Redis       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │   Service Layer │    │   Data Layer    │
│   • Components  │    │   • Auth        │    │   • Drizzle ORM │
│   • Providers   │    │   • AI Agents   │    │   • Migrations  │
│   • Hooks       │    │   • Logging     │    │   • Validation  │
│   • State Mgmt  │    │   • Background  │    │   • Indexing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Core Technologies

### Frontend Stack
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with concurrent features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Backend Stack
- **Bun** - Fast JavaScript runtime and package manager
- **API Routes** - RESTful endpoints in Next.js
- **Server Actions** - Server-side mutations
- **Middleware** - Request/response processing

### Database & State
- **PostgreSQL** - Primary relational database
- **ElectricSQL** - Real-time sync and offline support
- **Drizzle ORM** - Type-safe SQL query builder
- **Redis** - Caching and session storage
- **TanStack Query** - Server state management

### AI & Background Processing
- **OpenAI API** - Large language model integration
- **Letta Agents** - Multi-agent AI system
- **Inngest** - Background job processing
- **WebSockets** - Real-time communication

## 📂 Directory Structure

```
codex-clone/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── (pages)/           # Route groups and pages
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── ui/               # Base UI primitives
│   ├── forms/            # Form components
│   └── providers/        # React context providers
├── lib/                   # Core business logic
│   ├── auth/             # Authentication services
│   ├── electric/         # ElectricSQL client
│   ├── logging/          # Winston logging system
│   ├── ai/               # AI agent integrations
│   └── utils.ts          # Shared utilities
├── hooks/                 # Custom React hooks
├── stores/               # Zustand state stores
├── db/                   # Database schema and migrations
├── tests/                # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
└── docs/                 # Documentation
```

## 🔄 Data Flow

### Request Lifecycle
1. **Client Request** → Next.js App Router
2. **Middleware** → Authentication, logging, CORS
3. **Route Handler** → API logic or page rendering
4. **Service Layer** → Business logic and data access
5. **Database** → PostgreSQL queries via Drizzle ORM
6. **Response** → JSON API or HTML page

### Real-time Updates
1. **Database Change** → PostgreSQL trigger
2. **ElectricSQL** → Change detection and sync
3. **WebSocket** → Real-time client notification
4. **React Query** → Cache invalidation
5. **UI Update** → Optimistic updates and re-render

## 🔐 Security Architecture

### Authentication Flow
- **OAuth 2.0** - GitHub, OpenAI, Anthropic providers
- **JWT Tokens** - Stateless authentication
- **Session Management** - Redis-based sessions
- **PKCE** - Proof Key for Code Exchange

### Authorization
- **Role-based Access** - User, admin, system roles
- **Resource Permissions** - Fine-grained access control
- **API Key Management** - Secure credential storage

### Data Protection
- **Input Validation** - Zod schema validation
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Content Security Policy
- **Sensitive Data Redaction** - Automatic log filtering

## ⚡ Performance Optimizations

### Frontend
- **Server Components** - Reduced JavaScript bundle
- **Streaming** - Progressive page loading
- **Code Splitting** - Dynamic imports
- **Image Optimization** - Next.js image component

### Backend
- **Connection Pooling** - Database connection management
- **Query Optimization** - Indexed queries and caching
- **Background Jobs** - Async processing with Inngest
- **CDN Integration** - Static asset delivery

### Database
- **Indexing Strategy** - Optimized query performance
- **Read Replicas** - Horizontal scaling
- **Caching Layer** - Redis for hot data
- **Query Monitoring** - Performance tracking

## 🔍 Observability

### Logging
- **Winston Logger** - Structured JSON logging
- **Correlation IDs** - Request tracing
- **Log Levels** - Error, warn, info, debug
- **Sensitive Data Redaction** - Automatic filtering

### Monitoring
- **OpenTelemetry** - Distributed tracing
- **Metrics Collection** - Performance indicators
- **Health Checks** - System status monitoring
- **Error Tracking** - Exception handling

### Development
- **Hot Reloading** - Fast development feedback
- **Type Checking** - Real-time TypeScript validation
- **Test Coverage** - Comprehensive test metrics
- **Code Quality** - Linting and formatting

## 🚀 Deployment Architecture

### Production Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Edge      │    │   Application   │    │   Database      │
│   • Static      │    │   • Next.js     │    │   • PostgreSQL  │
│   • Images      │◄──►│   • API Routes  │◄──►│   • Redis       │
│   • Cache       │    │   • Background  │    │   • Backups     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Scaling Strategy
- **Horizontal Scaling** - Multiple application instances
- **Database Sharding** - Partitioned data storage
- **Microservices** - Domain-driven service boundaries
- **Event-Driven Architecture** - Loose coupling

## 🔧 Development Workflow

### Local Development
1. **Environment Setup** - Bun, PostgreSQL, Redis
2. **Dependency Installation** - `bun install`
3. **Database Migration** - `bun run db:migrate`
4. **Development Server** - `bun run dev:all`

### Quality Assurance
1. **Type Checking** - `bun run typecheck`
2. **Linting** - `bun run lint`
3. **Testing** - `bun run test`
4. **Coverage** - `bun run test:coverage`

### Deployment Pipeline
1. **Code Review** - GitHub pull requests
2. **Automated Testing** - CI/CD pipeline
3. **Security Scanning** - Vulnerability assessment
4. **Production Deployment** - Blue/green deployment

## 📚 Key Design Patterns

### Frontend Patterns
- **Compound Components** - Flexible component APIs
- **Render Props** - Logic sharing
- **Custom Hooks** - Stateful logic extraction
- **Error Boundaries** - Graceful error handling

### Backend Patterns
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic encapsulation
- **Middleware Pattern** - Cross-cutting concerns
- **Event Sourcing** - Audit trail and replay

### Integration Patterns
- **API Gateway** - Centralized routing
- **Circuit Breaker** - Fault tolerance
- **Retry Pattern** - Resilient operations
- **Bulkhead Pattern** - Resource isolation

---

This architecture provides a solid foundation for building scalable, maintainable, and performant applications while ensuring security and observability throughout the system.