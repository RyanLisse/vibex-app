# Task Completion Workflow

## Pre-Commit Checklist
1. `bun run check:fix` - Fix code formatting and linting
2. `bun run type-check` - Validate TypeScript
3. `bun run test:fast` - Run fast tests (30s)
4. Verify no compilation errors

## Pre-Push Checklist  
1. `bun run test:fast` - Fast pre-push checks
2. `bun run security` - Security audit
3. Auto-runs via pre-push hook

## Quality Validation
1. `bun run quality` - Full quality check (lint + typecheck + coverage + security)
2. `make test-all` - All tests (currently hangs - NEEDS FIX)
3. `bun run build` - Production build test
4. Zero TypeScript errors required
5. 100% test pass rate required
6. No code smells allowed

## Critical Issue: Testing Infrastructure Must Be Fixed
- Current `make test-all` hangs and times out
- Need to resolve all test failures and hanging issues
- Must achieve 0 failures, 100% pass rate