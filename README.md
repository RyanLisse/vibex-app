# Vibex - Modern AI Code Generation Platform

A cutting-edge AI-powered code generation platform featuring real-time synchronization, advanced state management, and comprehensive developer tooling. Built with Next.js 15, ElectricSQL, and modern web technologies. This project is part of the **Terragon Labs** ecosystem, providing enterprise-grade AI agent orchestration and container-based development environments.

## 🔗 Demo

[https://vibex.vercel.app/](https://vibex.vercel.app/)

## 🏢 Terragon Labs Integration

This platform integrates with Terragon Labs' advanced AI development infrastructure:

- **Container-Use Integration**: Modal Labs serverless environments for isolated agent execution
- **Multi-Source Task Creation**: Create tasks from GitHub issues, PR comments, voice commands, and screenshots  
- **Git Worktree Management**: Parallel development workflows with automated conflict resolution
- **Ambient Agent Visualization**: Real-time monitoring and debugging of AI agent workflows
- **Enterprise Observability**: Comprehensive monitoring with Sentry, OpenTelemetry, and custom metrics

## ✨ Features

### Core Capabilities

- 🤖 **AI-Powered Code Generation** - Multiple AI models (OpenAI, Anthropic)
- 🔄 **Real-time Synchronization** - Instant updates across all clients with ElectricSQL
- 🐙 **GitHub Integration** - Full repository management and OAuth authentication
- 🌍 **Sandboxed Execution** - Secure code execution with E2B environments
- 🎨 **Modern UI** - Tailwind CSS v4 with shadcn/ui components
- 📝 **Rich Content** - Markdown rendering with syntax highlighting

### Advanced Architecture

- 🗄️ **PostgreSQL + Drizzle ORM** - Type-safe database operations
- ⚡ **ElectricSQL** - Real-time, offline-first data sync
- 📊 **TanStack Query** - Advanced server state management
- 🚀 **WASM Modules** - High-performance computing capabilities
- 🔍 **OpenTelemetry** - Comprehensive observability
- 🧪 **Modern Testing** - Vitest, Playwright, and Storybook

## 🚀 Prerequisites

Before you begin, make sure you have:

- **Bun** (v1.0 or higher) - Primary runtime
- **Node.js** (v18 or higher) - For compatibility
- **PostgreSQL** (v14 or higher) - Database
- **Redis** (optional) - For caching
- **Inngest CLI** - Background job processing
- API Keys:
  - **OpenAI API key** - For AI model access
  - **Anthropic API key** (optional) - For Claude models
  - **Google AI API key** - For Gemini models
  - **E2B API key** - For sandboxed execution
  - **GitHub OAuth app** - For repository integration
  - **Modal Labs API key** - For Terragon container integration
  - **Sentry DSN** - For error monitoring and observability

## 📦 Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/vibex.git
cd vibex

# Install dependencies with Bun
bun install

# Or use npm/yarn
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb vibex_dev

# Run migrations
bun run db:migrate

# Initialize ElectricSQL
bun run db:init
```

### 3. Environment Configuration

Create a `.env.local` file with required variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/vibex_dev
ELECTRIC_URL=postgresql://user:password@localhost:5432/vibex_dev

# AI Services
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
E2B_API_KEY=your_e2b_api_key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Terragon Labs - Modal Integration
MODAL_API_KEY=your_modal_api_key
MODAL_WORKSPACE=your_workspace_name

# ElectricSQL Configuration
ELECTRIC_SERVICE_URL=http://localhost:5133
ELECTRIC_PROXY_URL=http://localhost:5134
ELECTRIC_WEBSOCKET_URL=ws://localhost:5133
ELECTRIC_AUTH_TOKEN=your_electric_auth_token
ELECTRIC_LOCAL_DB_PATH=idb://electric-local

# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Authentication
AUTH_SECRET=your_auth_secret_here

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Inngest Background Jobs
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Observability & Monitoring
TELEMETRY_ENABLED=true
TELEMETRY_BACKEND=jaeger
TELEMETRY_SAMPLING_RATIO=0.1
LOGGING_LEVEL=info
SERVICE_NAME=vibex
SERVICE_VERSION=1.0.0

# Alert System
ALERTS_ENABLED=true
ALERTS_SLACK_WEBHOOK_URL=your_slack_webhook
ALERTS_EMAIL_FROM=alerts@yourcompany.com
```

#### Getting API Keys:

- **OpenAI API Key**: Get it from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Google AI API Key**: Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **E2B API Key**: Sign up at [E2B](https://e2b.dev/) and get your API key
- **GitHub OAuth**: Create a new OAuth app in your [GitHub Developer Settings](https://github.com/settings/developers)
- **Modal Labs API Key**: Sign up at [Modal Labs](https://modal.com) for Terragon container integration
- **Sentry DSN**: Create a project at [Sentry.io](https://sentry.io) for error monitoring

## 📊 TypeScript Status

See [TypeScript Compilation Status](./docs/TYPESCRIPT_COMPILATION_STATUS.md) for detailed information about the current TypeScript compilation state and fixes applied.

## 🛠️ Development

### Quick Start (All Services)

```bash
# Start all services concurrently
bun run dev:all
```

This starts:

- Next.js development server (with Turbopack)
- Inngest development server
- Database migrations watcher

### Manual Service Start

#### 1. Database Services

```bash
# Start ElectricSQL sync service (if running locally)
docker-compose up -d electric

# Or use cloud ElectricSQL
# Configure ELECTRIC_SERVICE_URL in .env.local
```

#### 2. Inngest Development Server

```bash
# In a separate terminal
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

#### 3. Next.js Application

```bash
# Main development server
bun run dev

# Or with specific flags
INNGEST_DEV=1 bun run dev --turbopack
```

The application will be available at:

- **App**: `http://localhost:3000`
- **Inngest Dashboard**: `http://localhost:8288`
- **Database Studio**: `bun run db:studio`

## 📋 Available Scripts

### Development

- `bun run dev` - Start development server with Turbopack
- `bun run dev:all` - Start all services concurrently (Next.js + Inngest)
- `bun run build` - Build for production
- `bun start` - Start production server

### Testing

- `bun run test` - Run all test suites (unit + components + integration)
- `bun run test:unit` - Run unit tests with Vitest
- `bun run test:components` - Run component tests
- `bun run test:integration` - Run integration tests
- `bun run test:browser` - Run browser-based tests
- `bun run test:coverage` - Generate comprehensive coverage report

### Database

- `bun run db:migrate` - Run database migrations
- `bun run db:rollback` - Rollback migrations
- `bun run db:studio` - Open Drizzle Studio
- `bun run db:health` - Check database connectivity
- `bun run db:generate` - Generate migration files

### Code Quality

- `bun run lint` - Run Next.js linting
- `bun run lint:fix` - Fix linting issues automatically
- `bun run typecheck` - TypeScript type checking
- `bun run format` - Format code with Biome
- `bun run check` - Run Biome checks
- `bun run check:fix` - Fix Biome issues automatically

### Specialized Commands

- `bun run demo:voice-brainstorm` - Run voice brainstorming demo
- `bun run test:inngest` - Test Inngest background jobs
- `bun run migration:status` - Check data migration status
- `bun run migration:migrate` - Run data migrations

## 🏗️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── _components/        # Page-specific components
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   │   ├── agents/        # AI agent endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── environments/  # Environment management
│   │   ├── inngest/       # Background job handlers
│   │   ├── migration/     # Data migration endpoints
│   │   ├── ambient-agents/ # Terragon agent visualization
│   │   └── tasks/         # Task management
│   ├── ambient-agents/    # Terragon agent dashboard
│   ├── voice-brainstorm/  # Voice command interface
│   └── auth/              # Authentication pages
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui components
│   ├── providers/         # React context providers
│   ├── ambient-agents/    # Terragon visualization components
│   ├── auth/              # Authentication components
│   └── features/          # Feature-specific components
│       ├── kanban/        # Kanban board components
│       ├── voice-tasks/   # Voice task creation
│       └── pr-integration/ # GitHub PR integration
├── db/                    # Database layer
│   ├── schema.ts          # Drizzle ORM schema
│   ├── config.ts          # Database configuration
│   └── migrations/        # SQL migrations
├── hooks/                 # Custom React hooks
│   ├── use-environment-queries.ts
│   ├── use-electric-*.ts  # ElectricSQL hooks
│   ├── use-audio-*.ts     # Audio/voice hooks
│   └── ambient-agents/    # Terragon agent hooks
├── lib/                   # Core libraries
│   ├── electric/          # ElectricSQL client
│   ├── migration/         # Data migration system
│   ├── wasm/              # WASM modules
│   ├── observability/     # Monitoring & tracing
│   ├── container-use-integration/ # Terragon Modal Labs integration
│   ├── agent-memory/      # AI agent memory management
│   ├── alerts/            # Alert system
│   ├── logging/           # Advanced logging with Winston/Sentry
│   ├── auth/              # Authentication utilities
│   └── inngest.ts         # Background jobs
├── scripts/               # CLI tools & utilities
│   ├── migration-cli.ts   # Migration CLI
│   ├── automation/        # Development automation
│   └── demo-voice-brainstorm.ts # Voice demo
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── sentry/            # Sentry integration tests
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md    # System architecture
│   ├── SENTRY_INTEGRATION.md # Observability guide
│   ├── TERRAGON_INTEGRATION.md # Terragon features
│   └── api/               # API documentation
└── wasm-modules/          # WebAssembly modules
    └── vector-search/     # Vector search optimization
```

## 🏢 Terragon Labs Features

### Container-Use Integration
- **Modal Labs Serverless**: Isolated environments for each AI agent
- **Git Worktree Management**: Parallel development with automatic conflict resolution
- **Multi-Source Task Creation**: Support for GitHub issues, PR comments, voice commands, and screenshots
- **Cost Optimization**: Real-time resource monitoring and intelligent scaling

### Ambient Agent Visualization
- **Real-time Dashboard**: Interactive visualization of AI agent workflows
- **Performance Monitoring**: Live tracking of agent activities and resource usage
- **Event Stream Visualization**: Real-time event flow with categorization
- **React Flow Integration**: Custom nodes and edges for complex workflow visualization

### Enterprise Observability
- **Sentry Integration**: Comprehensive error tracking and performance monitoring
- **Winston + Sentry Logging**: Centralized logging with automatic error capture
- **OpenTelemetry**: Distributed tracing and custom metrics
- **Alert System**: Multi-channel alerting (Slack, email, webhooks)

### Voice & Audio Features
- **Gemini Audio Chat**: Real-time voice interaction with AI models
- **Voice Command Processing**: Speech-to-text task creation
- **Audio Playback Controls**: Integrated audio controls for voice responses

## 🔧 Key Technologies

### Database & ORM

- **PostgreSQL 14+** - Primary database
- **Drizzle ORM** - Type-safe SQL queries
- **PGlite** - Embedded PostgreSQL for offline support

### Real-time Sync

- **ElectricSQL** - Bidirectional sync with conflict resolution
- **WebSocket** - Real-time communication
- **Server-Sent Events** - Real-time updates for agent visualization
- **Offline Queue** - Resilient operation handling

### State Management

- **TanStack Query** - Server state with caching
- **Optimistic Updates** - Instant UI feedback
- **WASM Optimization** - Performance for large datasets
- **Zustand** - Lightweight state management

### Background Processing

- **Inngest** - Reliable job processing
- **Event-driven** - Decoupled architecture
- **Real-time Updates** - Progress tracking
- **Queue Management** - Redis-backed job queues

### Performance & Monitoring

- **WASM Modules** - High-performance computing
- **Vector Search** - SIMD-optimized similarity search
- **Sentry Performance** - Real-time performance monitoring
- **OpenTelemetry** - Distributed tracing and metrics
- **Edge Ready** - Optimized for edge deployment

## 🌐 Deployment

### Production Checklist

1. **Database Setup**

   ```bash
   # Create production database
   createdb vibex_prod

   # Run migrations
   DATABASE_URL=prod_url bun run db:migrate

   # Verify ElectricSQL sync
   bun run db:health
   ```

2. **Environment Variables**

   ```bash
   # Required for production
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   ELECTRIC_URL=postgresql://...

   # AI Services (see .env.example for full list)
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   GOOGLE_AI_API_KEY=
   E2B_API_KEY=
   
   # GitHub Integration
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   
   # Terragon Labs Integration
   MODAL_API_KEY=
   MODAL_WORKSPACE=
   
   # Observability
   NEXT_PUBLIC_SENTRY_DSN=
   SENTRY_ORG=
   SENTRY_PROJECT=
   SENTRY_AUTH_TOKEN=

   # Security
   AUTH_SECRET=
   INNGEST_SIGNING_KEY=
   ```

3. **Data Migration**
   ```bash
   # Migrate existing data
   bun run migration:status
   bun run migration:migrate --production
   ```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Vercel Configuration:**

- Enable Edge Functions for optimal performance
- Configure environment variables in dashboard
- Set up custom domain and SSL

### Deploy to Railway/Render

Both platforms support PostgreSQL and Redis out of the box:

1. Connect GitHub repository
2. Add PostgreSQL and Redis services
3. Configure environment variables
4. Deploy with automatic builds

### Docker Deployment

```bash
# Build production image
docker build -t vibex:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Performance Optimization

1. **Enable Caching**
   - Configure Redis for session storage
   - Enable Next.js ISR/SSG where applicable
   - Use CDN for static assets

2. **Database Optimization**
   - Add appropriate indexes
   - Configure connection pooling
   - Enable query result caching

3. **Monitoring Setup**
   - Configure OpenTelemetry exporters
   - Set up error tracking (Sentry)
   - Enable performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection**

   ```bash
   # Test database connection
   bun run db:health

   # Check migrations status
   bun run db:status
   ```

2. **ElectricSQL Sync Issues**
   - Verify ELECTRIC_URL is correct
   - Check WebSocket connectivity
   - Review sync logs in browser console

3. **Terragon Container Integration Issues**
   - Verify MODAL_API_KEY is valid and has proper permissions
   - Check Modal workspace exists and is accessible
   - Review container logs in Modal dashboard
   - Ensure proper network connectivity to Modal Labs

4. **Voice/Audio Features Not Working**
   - Verify GOOGLE_AI_API_KEY for Gemini audio chat
   - Check browser microphone permissions
   - Ensure HTTPS connection (required for microphone access)
   - Test audio input/output device functionality

5. **Ambient Agent Visualization Issues**
   - Check Server-Sent Events connection in browser dev tools
   - Verify API endpoints are accessible: `/api/ambient-agents/sse`
   - Clear browser cache if visualization appears stale
   - Check React Flow component rendering in console

6. **Sentry Integration Problems**
   - Verify NEXT_PUBLIC_SENTRY_DSN is publicly accessible
   - Check SENTRY_AUTH_TOKEN has upload permissions
   - Review Sentry project settings and quotas
   - Test error capture with manual Sentry.captureException()

7. **WASM Module Errors**
   - Ensure browser supports WASM
   - Check for SIMD support for vector search
   - Fall back to JavaScript implementation
   - Verify WASM files are served with correct MIME types

8. **Type Errors**

   ```bash
   # Regenerate types
   bun run db:generate
   bun run typecheck
   ```

9. **Migration Problems**

   ```bash
   # Check migration status
   bun run migration:status --verbose

   # Create backup before retry
   bun run migration:backup
   ```

10. **Alert System Not Working**
    - Check ALERTS_SLACK_WEBHOOK_URL is valid
    - Verify email configuration for SMTP alerts
    - Test webhook endpoints manually
    - Review alert rate limiting settings

### Debug Mode

```bash
# Enable debug logging
DEBUG=* bun run dev

# Specific modules
DEBUG=electric:*,migration:* bun run dev
```

### Performance Issues

1. **Slow Queries**
   - Check database indexes
   - Review query patterns in logs
   - Enable query result caching

2. **Memory Usage**
   - Monitor WASM module memory
   - Check for memory leaks in subscriptions
   - Use pagination for large datasets

### Getting Help

- **Documentation**: See `/docs` folder for detailed guides
- **Architecture**: Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Migration Guide**: Check [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md)
- **Sentry Integration**: See [SENTRY_INTEGRATION.md](./docs/SENTRY_INTEGRATION.md)
- **Terragon Features**: Explore Terragon-specific functionality
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord server

### 🚀 Quick Start Commands

```bash
# Full development setup
git clone <repository>
cd vibex-app
bun install
cp .env.example .env.local  # Configure your API keys
bun run db:migrate
bun run dev:all

# Access the application
open http://localhost:3000

# Access Terragon Agent Dashboard
open http://localhost:3000/ambient-agents

# Voice Brainstorming Demo
open http://localhost:3000/voice-brainstorm
```

---

**Built with ❤️ by Terragon Labs**

Powered by Next.js 15, ElectricSQL, Modal Labs, Sentry, and modern web technologies. This platform represents the cutting edge of AI agent orchestration and collaborative development environments.
