# Vibex App Test Resolution Action Plan

## Executive Summary
This action plan addresses 631 failing tests and 214 errors across the vibex-app project. The plan prioritizes high-impact issues first while maintaining stability of previously fixed components.

**Current Status:**
- ✅ 909 passing tests
- ❌ 631 failing tests  
- ⚠️ 214 errors
- Total: 1743 tests across 296 files

**Target:** Reduce failing tests to <10 across entire suite

## Phase 1: Critical Infrastructure Issues (Days 1-2)
*These issues block multiple test suites and must be fixed first*

### 1.1 Fix Vitest Global Variables (214+ errors)
**Impact:** Blocking ~214 test files from running properly
**Root Cause:** Missing Vitest globals (vi, describe, it, beforeEach, afterEach)
**Solution:**
```typescript
// vitest-setup.js - Add missing globals
import { vi, describe, it, test, expect, beforeEach, afterEach } from 'vitest';

globalThis.vi = vi;
globalThis.describe = describe;
globalThis.it = it;
globalThis.test = test;
globalThis.expect = expect;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;
```
**Effort:** 2 hours
**Testing:** Run `bun test --run` to verify globals are available

### 1.2 Fix Module Import/Export Issues
**Impact:** ~50+ test files with import errors
**Root Cause:** Missing exports, incorrect paths, mock issues
**Solution:**
1. Audit and fix all @dnd-kit/core exports
2. Fix electric-provider module exports
3. Update import paths in test files
4. Create proper mock files for complex modules

**Effort:** 4 hours
**Testing:** Verify each fixed import with targeted test runs

## Phase 2: High-Priority Feature Fixes (Days 2-4)

### 2.1 VoiceRecorder Timeout Issues (15 tests)
**Impact:** Voice recording feature completely untestable
**Root Cause:** Async operations not properly handled in tests
**Solution:**
```typescript
// voice-recorder.test.tsx fixes
1. Increase test timeouts for async operations
2. Add proper waitFor() wrappers
3. Mock MediaRecorder properly
4. Handle stream cleanup in afterEach

vi.setConfig({ testTimeout: 10000 }); // Increase timeout
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive'
};
```
**Effort:** 6 hours
**Testing:** Run isolated voice recorder tests with coverage

### 2.2 GitWorktreeManager Implementation (12 tests)
**Impact:** Git integration features broken
**Root Cause:** Incomplete worktree state management
**Solution:**
1. Implement proper worktree state tracking
2. Add missing methods for branch operations
3. Fix async command execution
4. Handle edge cases (no git repo, invalid branches)

```typescript
class GitWorktreeManager {
  private worktrees: Map<string, WorktreeState> = new Map();
  
  async createWorktree(branch: string, path: string): Promise<void> {
    // Validate inputs
    // Execute git worktree add
    // Update state tracking
    // Handle errors properly
  }
}
```
**Effort:** 8 hours
**Testing:** Mock git commands, test state transitions

### 2.3 MultiSourceTaskCreator Edge Cases (6 tests)
**Impact:** Task creation from multiple sources failing
**Root Cause:** String matching and timing issues
**Solution:**
1. Fix regex patterns for task parsing
2. Add proper debouncing for multi-source inputs
3. Handle concurrent source updates
4. Improve error boundaries

**Effort:** 4 hours
**Testing:** Test each source independently, then combined

## Phase 3: Medium-Priority Issues (Days 4-5)

### 3.1 Schema Validation Edge Cases
**Impact:** Data integrity issues in edge cases
**Solution:**
1. Update Zod schemas for edge cases
2. Add proper error messages
3. Handle null/undefined values
4. Fix date/time validation

**Effort:** 3 hours

### 3.2 Performance Test Thresholds
**Impact:** False positives in CI/CD
**Solution:**
1. Baseline current performance
2. Set realistic thresholds (p95 instead of p99)
3. Add environment-specific thresholds
4. Implement retry logic for flaky tests

**Effort:** 2 hours

### 3.3 Stream Utils WebSocket
**Impact:** Real-time features unreliable
**Solution:**
1. Mock WebSocket properly in tests
2. Handle connection lifecycle
3. Add proper cleanup
4. Test reconnection logic

**Effort:** 4 hours

## Phase 4: Low-Priority Issues (Days 5-6)

### 4.1 AI Input Components Export/Import
**Solution:** Create index.ts with proper exports
**Effort:** 1 hour

### 4.2 Kanban Board Task Management
**Solution:** Fix drag-and-drop test setup, mock DnD context
**Effort:** 3 hours

## Implementation Strategy

### Daily Workflow
1. **Morning:** Run full test suite, identify new issues
2. **Coding:** Focus on one phase at a time
3. **Testing:** Run affected test suites after each fix
4. **Evening:** Commit stable changes, update metrics

### Testing Approach
```bash
# Phase 1 validation
bun test --run setup  # Verify globals
bun test --run imports  # Verify imports

# Phase 2 validation (per feature)
bun test voice-recorder
bun test git-worktree
bun test multi-source

# Full regression
bun test --run --coverage
```

### Success Metrics
- Day 1: Reduce errors from 214 to <10
- Day 2: Reduce failures from 631 to <400
- Day 3: Reduce failures to <200
- Day 4: Reduce failures to <100
- Day 5: Reduce failures to <50
- Day 6: Achieve target of <10 failures

## Risk Mitigation

### Regression Prevention
1. Run full test suite after each major fix
2. Create integration tests for fixed components
3. Document all workarounds
4. Add smoke tests for critical paths

### Rollback Strategy
1. Commit each phase separately
2. Tag stable checkpoints
3. Keep fix/feature branches isolated
4. Document breaking changes

## Dependencies

### Fix Order (Critical Path)
1. Vitest globals MUST be fixed first
2. Import/export issues block many other fixes
3. VoiceRecorder depends on proper async handling
4. GitWorktreeManager needs command mocking
5. Performance tests need baseline data

### External Dependencies
- No external API changes needed
- No database schema changes
- No package updates required (use existing versions)

## Monitoring Progress

### Daily Checklist
- [ ] Run morning test suite baseline
- [ ] Update failing test count
- [ ] Document new issues discovered
- [ ] Commit at least one stable fix
- [ ] Update team on blockers

### Progress Tracking
```typescript
// Track in codebase
const TEST_METRICS = {
  day1: { errors: 214, failures: 631, target: 10 },
  // Update daily...
};
```

## Post-Implementation

### Documentation
1. Update test writing guidelines
2. Create troubleshooting guide
3. Document test utilities
4. Add CI/CD test documentation

### Maintenance
1. Set up test monitoring dashboard
2. Create test flakiness tracker
3. Schedule weekly test health reviews
4. Automate test metric reporting

## Conclusion

This plan provides a systematic approach to resolving test failures while maintaining stability. The phased approach ensures high-impact issues are addressed first, with clear success criteria and rollback strategies. Following this plan should achieve <10 failing tests within 6 days of focused effort.