# Integration Test Plan

## Overview

This document outlines the comprehensive integration testing strategy for the modernized codebase with Drizzle ORM, TanStack Query, ElectricSQL, and data migration systems.

## Test Objectives

1. Verify end-to-end workflows work correctly across all system components
2. Ensure data consistency between UI, API, and database layers
3. Validate optimistic updates and cache invalidation strategies
4. Test real-time synchronization features (even with mocked ElectricSQL)
5. Verify data migration from localStorage to database works correctly

## Test Scenarios

### 1. API + TanStack Query Integration

#### 1.1 Create Task Flow

- **Objective**: Verify task creation through API and UI updates
- **Components**: API route, TanStack Query hooks, UI components
- **Test Steps**:
  1. User fills out task form in UI
  2. Submit triggers `useCreateTask` mutation
  3. Optimistic update shows task immediately
  4. API creates task in database
  5. Cache invalidation triggers refetch
  6. UI shows server-confirmed task data

#### 1.2 Update Task Flow

- **Objective**: Verify task updates with optimistic UI changes
- **Components**: API route, TanStack Query hooks, ElectricSQL sync
- **Test Steps**:
  1. User modifies task properties
  2. `useUpdateTask` mutation triggers
  3. Optimistic update reflects changes immediately
  4. API updates database record
  5. Other clients receive sync event (mocked)
  6. UI confirms server state

#### 1.3 Delete Task Flow

- **Objective**: Verify task deletion with rollback on failure
- **Components**: API route, TanStack Query hooks, cache management
- **Test Steps**:
  1. User clicks delete button
  2. Task disappears from UI (optimistic)
  3. API processes deletion
  4. On success: cache updated, task removed
  5. On failure: task restored in UI

### 2. Data Migration Integration

#### 2.1 Full Migration Flow

- **Objective**: Verify complete migration from Zustand to database
- **Components**: Migration hook, API routes, Zustand stores
- **Test Steps**:
  1. Load app with data in localStorage/Zustand
  2. Migration detects unmigrated data
  3. Each item migrated via API
  4. Progress tracked and displayed
  5. On completion: Zustand stores cleared
  6. UI switches to database-backed data

#### 2.2 Partial Migration Recovery

- **Objective**: Verify resilience to migration failures
- **Components**: Migration error handling, retry logic
- **Test Steps**:
  1. Start migration with network issues
  2. Some items fail to migrate
  3. Failed items tracked and reported
  4. User can retry failed migrations
  5. Successfully migrated items not re-processed

### 3. Real-time Sync Integration

#### 3.1 Multi-user Task Updates

- **Objective**: Verify real-time updates across users
- **Components**: ElectricSQL (mocked), WebSocket events, UI updates
- **Test Steps**:
  1. User A creates/updates task
  2. Sync event generated
  3. User B receives sync event
  4. User B's UI updates automatically
  5. Conflict resolution if concurrent edits

#### 3.2 Offline Queue Processing

- **Objective**: Verify offline operations sync when online
- **Components**: Offline queue, sync manager, API routes
- **Test Steps**:
  1. User performs operations while offline
  2. Operations queued locally
  3. Connection restored
  4. Queue processes automatically
  5. UI reflects synced state

### 4. Performance & Optimization

#### 4.1 Batch Operations

- **Objective**: Verify efficient handling of bulk operations
- **Components**: API batch endpoints, query optimization
- **Test Steps**:
  1. Select multiple tasks
  2. Perform bulk update/delete
  3. Single API call for batch
  4. Optimistic updates for all items
  5. Efficient cache invalidation

#### 4.2 Cache Management

- **Objective**: Verify intelligent cache invalidation
- **Components**: TanStack Query cache, invalidation strategies
- **Test Steps**:
  1. Load task list (cached)
  2. Update single task
  3. Only affected queries invalidated
  4. Unrelated caches preserved
  5. Background refetch optimization

## Test Implementation

### Test Structure

```
tests/integration/
├── api-tanstack-integration.test.ts
├── data-migration-e2e.test.ts
├── realtime-sync-integration.test.ts
├── optimistic-updates-workflow.test.ts
└── performance-integration.test.ts
```

### Test Utilities

- Mock server for API responses
- Test database with migrations
- ElectricSQL mock with event simulation
- Custom render functions with providers
- Test data factories

## Success Criteria

- All test scenarios pass consistently
- No race conditions or flaky tests
- Performance benchmarks met
- Error scenarios handled gracefully
- Code coverage > 80% for integration paths

## Risk Areas

1. **Race Conditions**: Async operations may complete in different orders
2. **Cache Consistency**: Complex invalidation patterns may miss edge cases
3. **Migration Failures**: Network issues during migration need robust handling
4. **Sync Conflicts**: Concurrent edits need proper resolution
5. **Performance**: Large datasets may reveal optimization needs

## Testing Schedule

1. Phase 1: Core API + TanStack Query tests
2. Phase 2: Data migration scenarios
3. Phase 3: Real-time sync testing
4. Phase 4: Performance and edge cases
5. Phase 5: Full system integration tests

## Monitoring & Metrics

- Test execution time
- Flaky test detection
- Coverage reports
- Performance benchmarks
- Error rate tracking
