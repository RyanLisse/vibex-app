# Agent Configuration for Codex Clone

## Quick Start
```bash
./SETUP.sh          # Run full setup
bun install         # Install dependencies
bun run dev         # Start development server
```

## Essential Commands
- **Development**: `bun run dev` (Next.js with Turbopack)
- **Test All**: `bun run test:all` (Unit + Integration + E2E)
- **Quality Check**: `bun run quality` (Lint + Type + Test + Security)
- **Build**: `bun run build` (Production build)

## Testing Stack
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright (Chrome/Firefox/Safari/Mobile)
- **Component**: Storybook with interaction testing
- **Coverage**: 80% threshold with v8 provider

## Code Quality
- **Formatter/Linter**: Biome.js (replaces ESLint/Prettier)
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Pre-commit formatting, pre-push testing
- **Commits**: Conventional commits with commitlint

## Architecture
- **Framework**: Next.js 15 (App Router + RSC)
- **Styling**: TailwindCSS + Radix UI components
- **State**: Zustand stores + React Context
- **Package Manager**: Bun (faster than npm/yarn)
- **CI/CD**: GitHub Actions with parallel testing

## Key Files
- `test/setup.ts`: Global test configuration
- `biome.json`: Code quality settings
- `playwright.config.ts`: E2E test configuration
- `.husky/`: Git hooks for quality gates