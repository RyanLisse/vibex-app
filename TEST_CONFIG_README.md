# Bulletproof Vitest Configuration

This repository now includes a bulletproof test configuration that works reliably with Bun and avoids hanging issues.

## Quick Start

1. **Switch to the new configuration:**
   ```bash
   bun run scripts/use-new-test-config.ts
   ```

2. **Run tests:**
   ```bash
   bun test                    # Run all tests
   bun test:watch              # Watch mode
   bun test:ui                 # UI mode
   bun test:coverage           # With coverage
   ```

## Available Configurations

### 1. **vitest.config.working.ts** (Main Config)
- Bulletproof configuration that prevents hanging
- Works with all test types
- Single-threaded execution for stability
- Proper module resolution

### 2. **vitest.components.config.ts**
- Optimized for React component tests
- Uses jsdom environment
- Includes component-specific mocks

### 3. **vitest.utils.config.ts**
- For pure logic and utility tests
- Uses node environment
- Can run with more parallelism

### 4. **vitest.api.config.ts**
- For API routes and server-side code
- Includes Next.js specific mocks
- Proper request/response handling

### 5. **vitest.all.config.ts**
- Runs all tests with appropriate environments
- Automatically selects environment based on file location

## Troubleshooting

### If tests hang or fail:

1. **Run the troubleshooter:**
   ```bash
   bun test:troubleshoot       # Diagnose issues
   bun test:troubleshoot:fix   # Auto-fix issues
   ```

2. **Use the safe test runner:**
   ```bash
   bun run scripts/safe-test-runner.ts
   ```
   This includes:
   - Automatic timeout handling
   - Retry logic
   - Process cleanup
   - Cache clearing

### Common Issues and Solutions

1. **Tests hanging indefinitely**
   - Solution: The new config uses single-threaded execution
   - Run: `bun test:troubleshoot:fix`

2. **Module resolution errors**
   - Solution: Proper aliases and module handling configured
   - Check: `test-utils/mock-modules.ts` for mocks

3. **React component test failures**
   - Solution: Use `vitest.components.config.ts`
   - Includes proper jsdom setup and React mocks

4. **API test failures**
   - Solution: Use `vitest.api.config.ts`
   - Includes Next.js and fetch mocks

## Key Features

### 1. **Stability First**
- Single-threaded execution prevents race conditions
- Disabled problematic features (threads, isolation)
- Conservative timeouts (30s default)

### 2. **Proper Module Handling**
- Correct resolution for TypeScript paths
- Automatic JSX transform
- Node built-ins properly externalized

### 3. **Smart Mocking**
- Problematic modules pre-mocked
- Environment-specific mocks
- Centralized mock management

### 4. **Easy Debugging**
- Verbose output in CI
- Source maps enabled
- Clear error messages

## Scripts Reference

```bash
# Basic testing
bun test                      # Run all tests
bun test:watch                # Watch mode
bun test:ui                   # UI mode

# Specific test types
bun test:components           # Component tests only
bun test:utils                # Utility tests only
bun test:api                  # API tests only
bun test:all                  # All with smart env selection

# Coverage
bun test:coverage             # Generate coverage
bun test:coverage:ui          # Coverage with UI

# Maintenance
bun test:verify               # Verify setup works
bun test:troubleshoot         # Diagnose issues
bun test:troubleshoot:fix     # Auto-fix issues

# Safe execution
bun run scripts/safe-test-runner.ts           # With auto-recovery
bun run scripts/safe-test-runner.ts --watch   # Safe watch mode
bun run scripts/safe-test-runner.ts --retry 5 # Custom retry count
```

## Migration from Old Config

The new configuration is designed to be a drop-in replacement:

1. Your existing `vitest.config.ts` is backed up automatically
2. All test files work without changes
3. Package.json scripts are updated automatically
4. Run `bun test:verify` to ensure everything works

## Best Practices

1. **Use specific configs for different test types:**
   - Components → `vitest.components.config.ts`
   - Utils/Logic → `vitest.utils.config.ts`
   - API Routes → `vitest.api.config.ts`

2. **Keep tests simple:**
   - Avoid complex async operations in tests
   - Use proper cleanup in afterEach hooks
   - Don't share state between tests

3. **When adding new dependencies:**
   - Check if they need mocking in `test-utils/mock-modules.ts`
   - Add to `optimizeDeps.include` if commonly used
   - Add to `optimizeDeps.exclude` if problematic

4. **For CI/CD:**
   - Use `bun test:coverage` for coverage reports
   - Tests automatically retry in CI (2 attempts)
   - JSON reporter enabled for CI integration

## Support

If you encounter issues:

1. Run `bun test:troubleshoot:fix`
2. Check this README for solutions
3. Use `bun run scripts/safe-test-runner.ts` for difficult cases
4. Review test output for specific error messages

The configuration is designed to "just work" - if it doesn't, the troubleshooting tools should resolve most issues automatically.