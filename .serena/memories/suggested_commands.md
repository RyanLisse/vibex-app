# Essential Development Commands

## Daily Development
- `bun run test:fast` - ⚡ Fast pre-push checks (30s) - Recommended
- `bun run type-check` - 📝 Quick TypeScript validation (5s)
- `bun run dev` - Start development server with Turbopack
- `bun run dev:all` - Start all services (Next.js + Inngest)

## Testing Commands
- `make test-all` - Run ALL tests including E2E (may hang due to current issues)
- `bun run test:safe` - ✅ Safe Vitest execution (avoids hanging)
- `bun run test:e2e` - 🌐 E2E tests with Playwright
- `bun run test:coverage` - 📊 Coverage reports

## Code Quality
- `bun run lint` - Run Next.js linting
- `bun run format` - Format code with Biome
- `bun run check:fix` - Fix Biome issues automatically
- `bun run typecheck` - TypeScript type checking

## Database
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio
- `bun run db:health` - Check database connectivity

## Build & Deploy
- `bun run build` - Build for production
- `bun run analyze` - Analyze bundle size