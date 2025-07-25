# Test Suite Cleanup Recommendations

## Completed Cleanup Tasks
1. ✅ Fixed remaining jest references in `/scripts/fix-all-vi-mocks-final.ts`
2. ✅ Updated script documentation to reflect Vitest usage
3. ✅ Verified no empty test files exist
4. ✅ Analyzed test organization structure

## Remaining Cleanup Tasks

### 1. Remove Unused Files
- `bun-test-setup.js` - Not referenced anywhere, provides jest compatibility for Bun which conflicts with Vitest

### 2. Clean Console Statements in Tests
The following test files contain console.log statements that should be removed:
- `app/task/[id]/_components/chat-message.test.tsx`
- `components/error-boundary.test.tsx` 
- `db/schema.test.ts`
- `lib/neon/branching.test.ts`
- `lib/redis/mock-redis.test.ts`
- `lib/simple-mock-test.test.ts`
- `lib/testing/cli/tdd-cli.test.ts`
- `lib/testing/tdd-framework/core.test.ts`
- `src/components/ui/kibo-ui/ai/branch.test.tsx`
- `src/components/ui/kibo-ui/ai/conversation.test.tsx`

### 3. Fix test-verification.test.tsx
The test verification file has an ESBuild loader configuration error. The issue is in the vitest.config.ts where the loader configuration should be:
```typescript
loader: 'tsx' // not an object
```

### 4. Optimize Test Organization
Consider consolidating test directories:
- Merge similar test categories
- Remove redundant test files
- Standardize naming conventions

## Scripts to Run for Cleanup

```bash
# Remove unused bun-test-setup.js
rm bun-test-setup.js

# Remove console statements from test files
find . -name "*.test.*" -type f -not -path "./node_modules/*" -exec sed -i '/console\./d' {} \;

# Verify no jest references remain (except in migration scripts)
grep -r "jest\." . --include="*.test.*" --exclude-dir=node_modules | grep -v "scripts/"
```

## Performance Optimizations

1. **Test Parallelization**: Once Vitest hanging is resolved, enable parallel test execution
2. **Test Splitting**: Consider splitting large test files for better performance
3. **Mock Optimization**: Review and optimize mock implementations for faster test execution

## CI/CD Recommendations

1. **Timeout Configuration**: Set appropriate timeouts for hanging tests
2. **E2E Priority**: Run E2E tests as primary validation in CI
3. **Selective Testing**: Implement test selection based on changed files