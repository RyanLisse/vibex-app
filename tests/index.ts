// Test Utilities Index
// Comprehensive test utilities for enhanced testing capabilities

// Re-export commonly used testing utilities
export { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
export { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
export * from './fixtures'
export * from './helpers'
export * from './matchers'
export * from './mocks'
export * from './page-objects'
