# Test Health Dashboard

Generated: 2025-07-20T07:51:25.409Z

## 📊 Overview

- **Total Tests**: 235
- **Test Status**: 🟢 0 passing | 🔴 0 failing | ⏭️ 0 skipped

## 🎯 Coverage Metrics

| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| Lines | 0% | 80% | ❌ |
| Functions | 0% | 80% | ❌ |
| Branches | 0% | 80% | ❌ |
| Statements | 0% | 80% | ❌ |

## 🏃 Performance

- **Average Test Duration**: 0ms
- **Slowest Tests**:


## 🔍 Quality Metrics

- **Orphaned Tests**: 90 (tests without source files)
- **Missing Tests**: 387 (source files without tests)
- **Large Tests**: 44 (>500 lines)
- **Outdated Tests**: 0 (>30 days old)

## 📋 Recommendations

1. Remove 90 orphaned tests without source files
2. Add tests for 387 untested source files
3. Split 44 large test files (>500 lines)
4. Increase code coverage to meet 80% threshold

## 🚀 Quick Actions

```bash
# Run test analysis
bun run scripts/test-analysis.ts

# Check test relevance
bun run scripts/test-relevance-analyzer.ts

# Optimize tests
bun run scripts/test-optimization-toolkit.ts

# Clean up orphaned tests
bun run scripts/cleanup-orphaned-tests.ts

# Setup coverage
bun run scripts/coverage-setup.ts
```

## 📈 Progress Tracking

Track your test health improvements:

1. **Baseline** (current):
   - Tests: 235
   - Orphaned: 90
   - Missing: 387
   - Large: 44

2. **Target** (after optimization):
   - Tests: 428
   - Orphaned: 0
   - Missing: 193
   - Large: 0

## 🔧 Test Framework Status

**Note**: Test framework stabilization is in progress. Once tests are running:

1. Generate coverage baseline: `npm run test:coverage`
2. Run performance profiling: `bun run scripts/test-performance.ts`
3. Execute optimization scripts
4. Validate improvements

---

*Dashboard will be updated automatically as test metrics improve*
