# Vitest Hanging Issue - Fix Documentation

## Problem Summary
Vitest tests hang when running with ESBuild transformation, particularly when using Bun as the runtime. The issue appears to be related to:
- ESBuild transformation conflicts
- Process isolation problems
- Module resolution issues with Bun

## Applied Fixes

### 1. Configuration Changes (vitest.config.ts)
The main configuration has been updated with:
- Disabled ESBuild transformation (`esbuild: false` for some configs)
- Single-threaded execution (`maxConcurrency: 1`, `singleFork: true`)
- External module declarations for Node/Bun built-ins
- Disabled optimizations (`optimizeDeps.disabled: true`)
- Conservative timeout settings

### 2. Alternative Configurations Created

#### a) No-Hang Configuration (vitest.config.no-hang.ts)
- Most stable configuration
- Minimal features enabled
- Sequential execution only
- All problematic modules externalized

#### b) SWC Configuration (vitest.config.swc.ts)
- Uses SWC instead of ESBuild for transformation
- Requires: `bun add -D @vitejs/plugin-react-swc`

#### c) Bun-Optimized Configuration (vitest.config.bun.ts)
- Specifically tuned for Bun runtime
- Less process isolation for better compatibility

#### d) Jest Fallback (jest.config.fallback.js)
- Complete alternative to Vitest
- Works reliably but slower

### 3. Helper Scripts

#### Fix Script (scripts/fix-vitest-hanging.ts)
```bash
# Apply different fix strategies
bun run scripts/fix-vitest-hanging.ts 1  # No ESBuild
bun run scripts/fix-vitest-hanging.ts 2  # SWC
bun run scripts/fix-vitest-hanging.ts 3  # Bun-optimized
bun run scripts/fix-vitest-hanging.ts 4  # Jest fallback
bun run scripts/fix-vitest-hanging.ts 5  # Disable optimizations
```

#### Diagnostic Script (scripts/test-runner-diagnostic.ts)
```bash
# Run diagnostics to identify issues
bun run scripts/test-runner-diagnostic.ts
```

#### Safe Test Runner (scripts/run-tests-safely.sh)
```bash
# Run tests in batches to avoid hanging
./scripts/run-tests-safely.sh
```

## Quick Solutions

### Option 1: Use the Fixed Configuration (Recommended)
```bash
# This is already applied
npm run test:unit:components
```

### Option 2: Run Tests with Environment Variables
```bash
# Increase memory
NODE_OPTIONS='--max-old-space-size=8192' npm test

# Force single fork
VITEST_POOL_FORK=1 npm test

# Debug mode
DEBUG='vite:*,vitest:*' npm test
```

### Option 3: Use Batch Runner
```bash
# Run tests in small batches
./scripts/run-tests-safely.sh
```

### Option 4: Use Pure Bun Tests
```bash
# For unit tests that don't need Vitest features
bun test
```

### Option 5: Clear Cache and Reinstall
```bash
# Clear all caches
rm -rf node_modules/.vite .vitest node_modules/.cache

# Reinstall dependencies
rm -rf node_modules bun.lockb
bun install
```

## Long-term Solutions

1. **Migrate Critical Tests to Bun Native**
   - Move simple unit tests to `*.bun.test.ts` files
   - Use Bun's built-in test runner

2. **Split Test Suites**
   - Separate unit tests from integration tests
   - Run them with different configurations

3. **Consider Alternative Test Runners**
   - Jest with Bun compatibility
   - Native Bun test runner
   - Deno test runner (if migrating)

## Monitoring

To monitor if tests are hanging:
```bash
# Watch process with timeout
timeout 60 npm test || echo "Tests hung!"

# Check for zombie processes
ps aux | grep vitest

# Monitor memory usage during tests
watch -n 1 'ps aux | grep node | grep -v grep'
```

## Current Status
- Single file tests: ✅ Working
- Small batches: ✅ Working with batch runner
- Full test suite: ⚠️  May hang - use batch runner
- Jest fallback: ✅ Available as alternative

## Emergency Fallback
If all else fails:
```bash
# Use Jest directly
npx jest --config=jest.config.fallback.js
```