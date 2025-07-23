# Codebase Structure

## Key Directories
- `app/` - Next.js App Router (pages, API routes, actions)
- `components/` - Reusable UI components (shadcn/ui)
- `lib/` - Core libraries (electric, migration, wasm, observability)
- `hooks/` - Custom React hooks
- `db/` - Database layer (schema, migrations)
- `tests/` - Test suites (unit, integration, e2e)
- `scripts/` - CLI tools and automation
- `docs/` - Project documentation

## Configuration Files
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `vitest.config.ts` - Main test configuration
- `playwright.config.ts` - E2E test configuration
- `biome.json` - Code formatting and linting
- `drizzle.config.ts` - Database ORM configuration
- `tsconfig.json` - TypeScript configuration

## Branch Status
- Main branch: ahead of origin/main by 1 commit
- Multiple remote branches need merging
- Staged and unstaged changes present