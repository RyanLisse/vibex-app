# Integration Test Migration Plan

## Overview

This document outlines the migration strategy for converting existing unit tests to integration tests, focusing on tests that would benefit from integration-level testing.

## Current Test Analysis

### Tests Suitable for Integration Testing

Based on the current test suite, the following tests should be migrated to integration tests:

#### 1. API Route Tests
**Location**: `tests/integration/api/`
- `github-auth.test.ts` ✅ (already in integration)
- `app/api/auth/openai/callback/route.test.ts` → `tests/integration/api/auth/openai-callback.integration.test.ts`
- `app/api/auth/openai/status/route.test.ts` → `tests/integration/api/auth/openai-status.integration.test.ts`
- `app/api/auth/openai/logout/route.test.ts` → `tests/integration/api/auth/openai-logout.integration.test.ts`
- `app/api/auth/anthropic/callback/route.test.ts` → `tests/integration/api/auth/anthropic-callback.integration.test.ts`
- `app/api/auth/github/branches/route.test.ts` → `tests/integration/api/auth/github-branches.integration.test.ts`
- `app/api/test-inngest/route.test.ts` → `tests/integration/api/inngest.integration.test.ts`
- `app/api/inngest/route.test.ts` → `tests/integration/api/inngest-webhook.integration.test.ts`

#### 2. Action Tests (Server Actions)
**Location**: `tests/integration/actions/`
- `app/actions/inngest.test.ts` → `tests/integration/actions/inngest.integration.test.ts`
- `app/actions/vibekit.test.ts` → `tests/integration/actions/vibekit.integration.test.ts`

#### 3. Cross-Component Workflow Tests
**Location**: `tests/integration/workflows/`
- `tests/integration/gemini-audio-hooks.test.tsx` ✅ (already in integration)
- `tests/integration/gemini-audio.test.ts` ✅ (already in integration)
- `app/task/[id]/_hooks/use-task-subscription.ts` → `tests/integration/workflows/task-subscription.integration.test.ts`
- `app/task/[id]/_hooks/use-message-processor.test.ts` → `tests/integration/workflows/message-processing.integration.test.ts`

#### 4. State Management Integration Tests
**Location**: `tests/integration/state/`
- `stores/tasks.test.ts` → `tests/integration/state/task-store.integration.test.ts`
- `stores/environments.test.ts` → `tests/integration/state/environment-store.integration.test.ts`

#### 5. Authentication Flow Tests
**Location**: `tests/integration/auth/`
- `hooks/use-github-auth.test.ts` → `tests/integration/auth/github-auth.integration.test.ts`
- `hooks/use-anthropic-auth.test.ts` → `tests/integration/auth/anthropic-auth.integration.test.ts`
- `hooks/use-openai-auth.test.ts` → `tests/integration/auth/openai-auth.integration.test.ts`

### Tests That Should Remain as Unit Tests

These tests focus on isolated functionality and should stay as unit tests:

#### 1. Pure Utility Functions
- `lib/utils.test.ts` (className utility)
- `src/features/example-feature/utils/example-utils.test.ts`

#### 2. Type Definitions
- `src/features/example-feature/types.test.ts`
- `app/task/[id]/_types/message-types.test.ts`

#### 3. Pure Component Tests
- `components/ui/badge.test.tsx`
- `components/ui/button.test.tsx`
- `components/ui/card.test.tsx`
- All other UI component tests

#### 4. Isolated Hook Tests
- `src/hooks/useZodForm/fieldHelpers.test.ts`
- `src/hooks/useZodForm/formState.test.ts`
- `src/hooks/useZodForm/validation.test.ts`

#### 5. Guard Functions
- `app/task/[id]/_utils/message-guards.test.ts`

## Migration Strategy

### Phase 1: Infrastructure Setup ✅
- [x] Create integration-specific Vitest configuration
- [x] Update vitest.setup.ts for integration testing
- [x] Create integration test templates
- [x] Update package.json scripts
- [x] Create integration testing guide

### Phase 2: API Route Migration
**Target**: 1 week
**Priority**: High

1. **Create Integration Test Files**:
   ```bash
   mkdir -p tests/integration/api/auth
   mkdir -p tests/integration/api/inngest
   ```

2. **Migration Steps**:
   - Copy existing API route tests to integration directory
   - Rename files with `.integration.test.ts` suffix
   - Update imports and mocking strategy
   - Focus on end-to-end API flow rather than isolated handlers
   - Test with real HTTP requests using test helpers

3. **Example Migration**:
   ```typescript
   // Before (Unit Test)
   vi.mock('@/lib/auth/openai-codex', () => ({ ... }))
   
   // After (Integration Test)
   integrationTestHelpers.mockApiResponse('/api/auth/openai/callback', {
     access_token: 'test-token',
     user: { id: 123 }
   })
   ```

### Phase 3: Action and Workflow Migration
**Target**: 1 week
**Priority**: High

1. **Server Actions**:
   - Move `app/actions/*.test.ts` to `tests/integration/actions/`
   - Test complete action workflows including side effects
   - Mock external services but test internal integration

2. **Cross-Component Workflows**:
   - Move complex hook tests to `tests/integration/workflows/`
   - Test complete user journeys
   - Include real-time subscription testing

### Phase 4: State Management Integration
**Target**: 3 days
**Priority**: Medium

1. **Store Integration**:
   - Move store tests to `tests/integration/state/`
   - Test store interactions with API responses
   - Test cross-store communication
   - Include persistence testing

### Phase 5: Authentication Flow Integration
**Target**: 1 week
**Priority**: Medium

1. **Auth Integration**:
   - Move auth hook tests to `tests/integration/auth/`
   - Test complete OAuth flows
   - Test session management
   - Include error handling and recovery

### Phase 6: Cleanup and Documentation
**Target**: 2 days
**Priority**: Low

1. **Remove Duplicated Tests**:
   - Delete original test files after migration
   - Update test documentation
   - Update CI/CD configuration

2. **Performance Optimization**:
   - Optimize test execution time
   - Add parallel execution where safe
   - Configure test isolation

## File Structure After Migration

```
tests/
├── integration/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── github-auth.integration.test.ts ✅
│   │   │   ├── openai-callback.integration.test.ts
│   │   │   ├── openai-status.integration.test.ts
│   │   │   ├── openai-logout.integration.test.ts
│   │   │   ├── anthropic-callback.integration.test.ts
│   │   │   └── github-branches.integration.test.ts
│   │   └── inngest/
│   │       ├── webhook.integration.test.ts
│   │       └── test-endpoint.integration.test.ts
│   ├── actions/
│   │   ├── inngest.integration.test.ts
│   │   └── vibekit.integration.test.ts
│   ├── workflows/
│   │   ├── task-subscription.integration.test.ts
│   │   ├── message-processing.integration.test.ts
│   │   ├── gemini-audio-hooks.integration.test.ts ✅
│   │   └── gemini-audio.integration.test.ts ✅
│   ├── state/
│   │   ├── task-store.integration.test.ts
│   │   └── environment-store.integration.test.ts
│   ├── auth/
│   │   ├── github-auth.integration.test.ts
│   │   ├── anthropic-auth.integration.test.ts
│   │   └── openai-auth.integration.test.ts
│   └── templates/
│       ├── api-route.integration.test.ts ✅
│       ├── workflow.integration.test.ts ✅
│       └── state-management.integration.test.ts ✅
├── unit/
│   ├── components/
│   │   └── ui/
│   ├── hooks/
│   │   └── pure-functions/
│   ├── utils/
│   └── types/
└── e2e/
    └── (existing e2e tests)
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current test files
- [ ] Update CI/CD configuration
- [ ] Document migration process
- [ ] Create integration test templates

### During Migration
- [ ] Migrate API route tests
- [ ] Migrate action tests
- [ ] Migrate workflow tests
- [ ] Migrate state management tests
- [ ] Migrate authentication tests

### Post-Migration
- [ ] Update test documentation
- [ ] Optimize test performance
- [ ] Update coverage requirements
- [ ] Remove duplicate tests
- [ ] Update developer documentation

## Testing Strategy Changes

### Before (Unit Testing Focus)
- Mock all external dependencies
- Test isolated functions
- Fast execution
- High coverage of individual functions

### After (Integration Testing Focus)
- Mock external services, test internal integration
- Test complete workflows
- Realistic scenarios
- Coverage of critical user journeys

## Success Metrics

### Quantitative
- **Test Execution Time**: Should not increase by more than 3x
- **Coverage**: Maintain 70%+ integration test coverage
- **Reliability**: 95%+ test pass rate on first run
- **Maintenance**: 50% reduction in test maintenance overhead

### Qualitative
- **Confidence**: Higher confidence in deployments
- **Bug Detection**: Better at catching integration issues
- **Developer Experience**: Easier to understand test failures
- **Realism**: Tests better reflect real user scenarios

## Risk Mitigation

### Potential Issues
1. **Slower Test Execution**: Use parallel execution and optimize setup
2. **Test Flakiness**: Implement proper cleanup and isolation
3. **Complex Setup**: Create reusable test utilities
4. **Mock Complexity**: Balance realism with maintainability

### Mitigation Strategies
1. **Incremental Migration**: Migrate in phases
2. **Parallel Development**: Keep existing tests during migration
3. **Extensive Testing**: Test the test migration process
4. **Rollback Plan**: Keep backups of working tests

## Timeline

**Total Duration**: 3-4 weeks

- **Week 1**: API routes and actions migration
- **Week 2**: Workflow and state management migration
- **Week 3**: Authentication flow migration
- **Week 4**: Cleanup, optimization, and documentation

## Resources

### Tools
- Vitest for test execution
- Testing Library for React testing
- Custom integration test helpers
- Test server utilities

### Documentation
- Integration Testing Guide
- Test Templates
- Migration Examples
- Best Practices Guide

### Team Requirements
- 1 developer for migration work
- Code review from team lead
- QA validation of test effectiveness
- DevOps support for CI/CD updates