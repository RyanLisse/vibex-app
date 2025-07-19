# CloneDex - Modern AI Code Generation Platform

A cutting-edge AI-powered code generation platform featuring real-time synchronization, advanced state management, and comprehensive developer tooling. Built with Next.js 15, ElectricSQL, and modern web technologies.

## 🔗 Demo

[https://clonedex.vercel.app/](https://clonedex.vercel.app/)

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
  - **OpenAI API key**
  - **Anthropic API key** (optional)
  - **E2B API key**
  - **GitHub OAuth app**

## 📦 Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/clonedex.git
cd clonedex

# Install dependencies with Bun
bun install

# Or use npm/yarn
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb clonedex_dev

# Run migrations
bun run db:migrate

# Initialize ElectricSQL
bun run db:init
```

### 3. Environment Configuration

Create a `.env.local` file with required variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clonedex_dev
ELECTRIC_URL=postgresql://user:password@localhost:5432/clonedex_dev

# AI Services
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
E2B_API_KEY=your_e2b_api_key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ElectricSQL (optional custom config)
ELECTRIC_SERVICE_URL=http://localhost:5133
ELECTRIC_PROXY_URL=http://localhost:5134

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Inngest
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

#### Getting API Keys:

- **OpenAI API Key**: Get it from [OpenAI Platform](https://platform.openai.com/api-keys)
- **E2B API Key**: Sign up at [E2B](https://e2b.dev/) and get your API key
- **GitHub OAuth**: Create a new OAuth app in your [GitHub Developer Settings](https://github.com/settings/developers)

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
│   │   └── tasks/         # Task management
│   └── auth/              # Authentication pages
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui components
│   └── providers/         # React context providers
├── db/                    # Database layer
│   ├── schema.ts          # Drizzle ORM schema
│   ├── config.ts          # Database configuration
│   └── migrations/        # SQL migrations
├── hooks/                 # Custom React hooks
│   ├── use-environment-queries.ts
│   └── use-electric-*.ts  # ElectricSQL hooks
├── lib/                   # Core libraries
│   ├── electric/          # ElectricSQL client
│   ├── migration/         # Data migration system
│   ├── wasm/              # WASM modules
│   ├── observability/     # Monitoring & tracing
│   └── inngest.ts         # Background jobs
├── scripts/               # CLI tools & utilities
│   ├── migration-cli.ts   # Migration CLI
│   └── automation/        # Development automation
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── docs/                  # Documentation
    ├── ARCHITECTURE.md    # System architecture
    └── MIGRATION_GUIDE.md # Migration guide
```

## 🔧 Key Technologies

### Database & ORM

- **PostgreSQL 14+** - Primary database
- **Drizzle ORM** - Type-safe SQL queries
- **PGlite** - Embedded PostgreSQL for offline support

### Real-time Sync

- **ElectricSQL** - Bidirectional sync with conflict resolution
- **WebSocket** - Real-time communication
- **Offline Queue** - Resilient operation handling

### State Management

- **TanStack Query** - Server state with caching
- **Optimistic Updates** - Instant UI feedback
- **WASM Optimization** - Performance for large datasets

### Background Processing

- **Inngest** - Reliable job processing
- **Event-driven** - Decoupled architecture
- **Real-time Updates** - Progress tracking

### Performance

- **WASM Modules** - High-performance computing
- **Vector Search** - SIMD-optimized similarity search
- **Worker Threads** - Parallel processing
- **Edge Ready** - Optimized for edge deployment

## 🌐 Deployment

### Production Checklist

1. **Database Setup**

   ```bash
   # Create production database
   createdb clonedex_prod

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

   # API Keys (see .env.example for full list)
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   E2B_API_KEY=
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=

   # Security
   NEXTAUTH_SECRET=
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
docker build -t clonedex:latest .

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

3. **WASM Module Errors**
   - Ensure browser supports WASM
   - Check for SIMD support for vector search
   - Fall back to JavaScript implementation

4. **Type Errors**

   ```bash
   # Regenerate types
   bun run db:generate
   bun run type-check
   ```

5. **Migration Problems**

   ```bash
   # Check migration status
   bun run migration:status --verbose

   # Create backup before retry
   bun run migration:backup
   ```

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
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord server

---

Built with ❤️ using Next.js, ElectricSQL, and modern web technologies
