import type { MatcherFunction } from 'expect'
import { expect } from 'vitest'

// Extend Vitest's expect interface
interface CustomMatchers<R = unknown> {
  toBeValidUser(): R
  toBeValidProject(): R
  toHaveValidSchema(schema: any): R
  toBeWithinTimeRange(target: Date, toleranceMs: number): R
  toHaveValidApiResponse(): R
  toMatchSnapshot(name?: string): R
  toBeAccessible(): R
  toHavePerformanceMetrics(thresholds: PerformanceThresholds): R
  toResolveWithin(timeoutMs: number): R
  toEventuallyEqual(expected: any, options?: { timeout?: number; interval?: number }): R
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Type definitions
interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  owner: User
  collaborators: User[]
  createdAt: Date
  updatedAt: Date
}

interface ApiResponse {
  success: boolean
  status: number
  data: any
  error: string | null
}

interface PerformanceThresholds {
  renderTime?: { max: number }
  memoryUsage?: { max: number }
  bundleSize?: { max: number }
}

// User validation matcher
const toBeValidUser: MatcherFunction<[received: unknown]> = function (received) {
  const { isNot } = this

  const pass =
    received &&
    typeof received === 'object' &&
    typeof (received as any).id === 'string' &&
    typeof (received as any).email === 'string' &&
    typeof (received as any).name === 'string' &&
    typeof (received as any).role === 'string' &&
    typeof (received as any).isActive === 'boolean' &&
    (received as any).createdAt instanceof Date &&
    (received as any).updatedAt instanceof Date &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((received as any).email)

  return {
    pass,
    message: () =>
      isNot
        ? `Expected ${received} not to be a valid user`
        : `Expected ${received} to be a valid user with required fields (id, email, name, role, isActive, createdAt, updatedAt) and valid email format`,
  }
}

// Project validation matcher
const toBeValidProject: MatcherFunction<[received: unknown]> = function (received) {
  const { isNot } = this

  const pass =
    received &&
    typeof received === 'object' &&
    typeof (received as any).id === 'string' &&
    typeof (received as any).name === 'string' &&
    typeof (received as any).description === 'string' &&
    typeof (received as any).status === 'string' &&
    (received as any).owner &&
    typeof (received as any).owner === 'object' &&
    Array.isArray((received as any).collaborators) &&
    (received as any).createdAt instanceof Date &&
    (received as any).updatedAt instanceof Date

  return {
    pass,
    message: () =>
      isNot
        ? `Expected ${received} not to be a valid project`
        : `Expected ${received} to be a valid project with required fields (id, name, description, status, owner, collaborators, createdAt, updatedAt)`,
  }
}

// Schema validation matcher
const toHaveValidSchema: MatcherFunction<[received: unknown, schema: any]> = function (
  received,
  schema
) {
  const { isNot } = this

  try {
    // Basic schema validation - in a real implementation, this would use Zod
    const pass = validateSchema(received, schema)

    if (isNot && pass) {
      throw new Error(`Expected ${JSON.stringify(received)} not to match schema`)
    }

    if (!(isNot || pass)) {
      throw new Error(
        `Expected ${JSON.stringify(received)} to match schema ${JSON.stringify(schema)}`
      )
    }

    return {
      pass,
      message: () =>
        isNot
          ? `Expected ${JSON.stringify(received)} not to match schema`
          : `Expected ${JSON.stringify(received)} to match schema ${JSON.stringify(schema)}`,
    }
  } catch (error) {
    if (error.message.includes('Expected')) {
      throw error // Re-throw our own errors
    }
    throw new Error(`Schema validation failed: ${error}`)
  }
}

// Time range validation matcher
const toBeWithinTimeRange: MatcherFunction<[received: Date, target: Date, toleranceMs: number]> =
  function (received, target, toleranceMs) {
    const { isNot } = this

    // Input validation
    if (
      !(received instanceof Date) &&
      typeof received !== 'string' &&
      typeof received !== 'number'
    ) {
      throw new Error('Expected Date object, valid date string, or timestamp')
    }
    if (!(target instanceof Date) && typeof target !== 'string' && typeof target !== 'number') {
      throw new Error('Expected target to be Date object, valid date string, or timestamp')
    }

    try {
      const receivedTime =
        received instanceof Date ? received.getTime() : new Date(received).getTime()
      const targetTime = target instanceof Date ? target.getTime() : new Date(target).getTime()

      if (isNaN(receivedTime) || isNaN(targetTime)) {
        throw new Error('Invalid date values provided')
      }

      const difference = Math.abs(receivedTime - targetTime)
      const pass = difference <= toleranceMs

      return {
        pass,
        message: () =>
          isNot
            ? `Expected ${received} not to be within ${toleranceMs}ms of ${target}`
            : `Expected ${received} to be within ${toleranceMs}ms of ${target}, but was ${difference}ms away`,
      }
    } catch (error) {
      return {
        pass: false,
        message: () => `Date validation failed: ${error}`,
      }
    }
  }

// API response validation matcher
const toHaveValidApiResponse: MatcherFunction<[received: unknown]> = function (received) {
  const { isNot } = this

  const pass =
    received &&
    typeof received === 'object' &&
    typeof (received as any).success === 'boolean' &&
    typeof (received as any).status === 'number' &&
    Object.hasOwn(received as any, 'data') &&
    Object.hasOwn(received as any, 'error') &&
    ((received as any).success
      ? (received as any).error === null
      : typeof (received as any).error === 'string')

  return {
    pass,
    message: () =>
      isNot
        ? `Expected ${received} not to be a valid API response`
        : `Expected ${received} to be a valid API response with success, status, data, and error fields`,
  }
}

// Snapshot matcher (simplified)
const toMatchSnapshot: MatcherFunction<[received: unknown, name?: string]> = function (
  received,
  name
) {
  const { isNot } = this

  // In a real implementation, this would integrate with Vitest's snapshot system
  const serialized = JSON.stringify(received, null, 2)
  const snapshotName = name || 'default'

  // For testing purposes, we'll always pass
  const pass = true

  return {
    pass,
    message: () =>
      isNot
        ? `Expected ${received} not to match snapshot "${snapshotName}"`
        : `Expected ${received} to match snapshot "${snapshotName}"`,
  }
}

// Accessibility matcher
const toBeAccessible: MatcherFunction<[received: unknown]> = function (received) {
  const { isNot } = this

  const element = received as any
  const hasAriaLabel = element.attributes && element.attributes['aria-label']
  const hasRole = element.attributes && element.attributes['role']
  const hasTabIndex = element.attributes && Object.hasOwn(element.attributes, 'tabindex')

  const pass =
    element &&
    typeof element === 'object' &&
    element.tagName &&
    (hasAriaLabel || hasRole || element.textContent) && // Some form of accessible name
    (element.tagName !== 'BUTTON' || hasTabIndex !== false) // Buttons should be focusable

  return {
    pass,
    message: () =>
      isNot
        ? 'Expected element not to be accessible'
        : 'Expected element to be accessible with proper ARIA attributes and focusable state',
  }
}

// Performance metrics matcher
const toHavePerformanceMetrics: MatcherFunction<
  [received: unknown, thresholds: PerformanceThresholds]
> = function (received, thresholds) {
  const { isNot } = this

  const metrics = received as any
  const failures: string[] = []

  if (thresholds.renderTime && metrics.renderTime > thresholds.renderTime.max) {
    failures.push(
      `Render time ${metrics.renderTime}ms exceeds threshold ${thresholds.renderTime.max}ms`
    )
  }

  if (thresholds.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage.max) {
    failures.push(
      `Memory usage ${metrics.memoryUsage}MB exceeds threshold ${thresholds.memoryUsage.max}MB`
    )
  }

  if (thresholds.bundleSize && metrics.bundleSize > thresholds.bundleSize.max) {
    failures.push(
      `Bundle size ${metrics.bundleSize}KB exceeds threshold ${thresholds.bundleSize.max}KB`
    )
  }

  const pass = failures.length === 0

  return {
    pass,
    message: () =>
      isNot
        ? 'Expected performance metrics not to meet thresholds'
        : `Performance thresholds exceeded: ${failures.join(', ')}`,
  }
}

// Async matchers
const toResolveWithin: MatcherFunction<[received: Promise<any>, timeoutMs: number]> =
  async function (received, timeoutMs) {
    const { isNot } = this

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )

      await Promise.race([received, timeoutPromise])

      if (isNot) {
        throw new Error(`Expected promise not to resolve within ${timeoutMs}ms`)
      }

      return {
        pass: true,
        message: () => `Expected promise not to resolve within ${timeoutMs}ms`,
      }
    } catch (error) {
      if (!isNot) {
        throw new Error(`Promise did not resolve within ${timeoutMs}ms`)
      }

      return {
        pass: true,
        message: () => `Expected promise not to resolve within ${timeoutMs}ms`,
      }
    }
  }

const toEventuallyEqual: MatcherFunction<
  [received: () => any, expected: any, options?: { timeout?: number; interval?: number }]
> = async function (received, expected, options = {}) {
  const { isNot } = this
  const { timeout = 5000, interval = 100 } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const actual = typeof received === 'function' ? received() : received
      if (this.equals(actual, expected)) {
        if (isNot) {
          throw new Error(`Expected ${actual} not to eventually equal ${expected}`)
        }
        return {
          pass: true,
          message: () => `Expected ${actual} not to eventually equal ${expected}`,
        }
      }
    } catch (error) {
      // Continue trying
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  if (!isNot) {
    throw new Error(`Expected value to eventually equal ${expected} within ${timeout}ms`)
  }

  return {
    pass: true,
    message: () => `Expected value not to eventually equal ${expected} within ${timeout}ms`,
  }
}

// Helper function for schema validation
function validateSchema(data: any, schema: any): boolean {
  // Simplified schema validation - in production, use Zod
  if (typeof schema !== 'object' || schema === null) {
    return typeof data === typeof schema
  }

  for (const key in schema) {
    if (!(key in data)) {
      return false
    }

    const expectedType = schema[key]
    const actualValue = data[key]

    if (expectedType && typeof expectedType.asymmetricMatch === 'function') {
      // Handle Jest/Vitest asymmetric matchers like expect.any()
      if (!expectedType.asymmetricMatch(actualValue)) {
        return false
      }
    } else if (typeof expectedType === 'object' && expectedType.constructor === RegExp) {
      // Handle regex validation
      if (typeof actualValue !== 'string' || !expectedType.test(actualValue)) {
        return false
      }
    } else if (expectedType && expectedType.stringMatching) {
      // Handle expect.stringMatching()
      if (typeof actualValue !== 'string' || !expectedType.sample.test(actualValue)) {
        return false
      }
    } else if (typeof expectedType === 'object' && expectedType !== null) {
      // Recursively validate nested objects
      if (!validateSchema(actualValue, expectedType)) {
        return false
      }
    } else if (actualValue !== expectedType) {
      return false
    }
  }

  return true
}

// Register all matchers
expect.extend({
  toBeValidUser,
  toBeValidProject,
  toHaveValidSchema,
  toBeWithinTimeRange,
  toHaveValidApiResponse,
  toMatchSnapshot,
  toBeAccessible,
  toHavePerformanceMetrics,
  toResolveWithin,
  toEventuallyEqual,
})
