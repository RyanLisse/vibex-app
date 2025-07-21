import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskSubscriptionRefactored } from './use-task-subscription-refactored';

describe('useTaskSubscriptionRefactored', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => 
      useTaskSubscriptionRefactored({ taskId: 'test-task-id' })
    );

    expect(result.current).toBeDefined();
  });
});