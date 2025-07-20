import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TDDFramework, TestCase, TestResult, TestSuite } from './core'

describe('TDDFramework', () => {
  let framework: TDDFramework

  beforeEach(() => {
    framework = new TDDFramework()
  })

  describe('Test Case Management', () => {
    it('should create a test case with failing status by default', () => {
      const testCase = framework.createTestCase('should do something', () => {
        expect(true).toBe(false) // Intentionally failing
      })

      expect(testCase.name).toBe('should do something')
      expect(testCase.status).toBe('failing')
      expect(testCase.implementation).toBeNull()
    })

    it('should allow setting test implementation', () => {
      const testCase = framework.createTestCase('should do something', () => {
        expect(true).toBe(true)
      })

      const implementation = () => 'implementation'
      testCase.setImplementation(implementation)

      expect(testCase.implementation).toBe(implementation)
      expect(testCase.status).toBe('passing')
    })

    it('should track test lifecycle state', () => {
      const testCase = framework.createTestCase('should do something', () => {
        expect(true).toBe(true)
      })

      expect(testCase.getLifecycleState()).toBe('red')

      testCase.setImplementation(() => 'implementation')
      expect(testCase.getLifecycleState()).toBe('green')

      testCase.refactor(() => 'refactored implementation')
      expect(testCase.getLifecycleState()).toBe('refactor')
    })
  })

  describe('Test Suite Management', () => {
    it('should create and manage test suites', () => {
      const suite = framework.createTestSuite('User Management')

      expect(suite.name).toBe('User Management')
      expect(suite.tests).toHaveLength(0)
    })

    it('should add tests to suite', () => {
      const suite = framework.createTestSuite('User Management')
      const testCase = framework.createTestCase('should create user', () => {
        expect(true).toBe(true)
      })

      suite.addTest(testCase)

      expect(suite.tests).toHaveLength(1)
      expect(suite.tests[0]).toBe(testCase)
    })

    it('should run all tests in suite', async () => {
      const suite = framework.createTestSuite('User Management')
      const testCase1 = framework.createTestCase('should create user', () => {
        expect(true).toBe(true)
      })
      const testCase2 = framework.createTestCase('should delete user', () => {
        expect(false).toBe(true) // Failing test
      })

      suite.addTest(testCase1)
      suite.addTest(testCase2)

      const results = await suite.run()

      expect(results).toHaveLength(2)
      expect(results[0].passed).toBe(true)
      expect(results[1].passed).toBe(false)
    })
  })

  describe('TDD Workflow', () => {
    it('should enforce red-green-refactor cycle', () => {
      const workflow = framework.createWorkflow()

      // Red phase
      const testCase = workflow.red('should calculate sum', () => {
        const result = sum(2, 3)
        expect(result).toBe(5)
      })

      expect(testCase.getLifecycleState()).toBe('red')

      // Green phase
      const implementation = (a: number, b: number) => a + b
      workflow.green(testCase, implementation)

      expect(testCase.getLifecycleState()).toBe('green')

      // Refactor phase
      const refactoredImpl = (a: number, b: number) => {
        // Add validation
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new Error('Arguments must be numbers')
        }
        return a + b
      }
      workflow.refactor(testCase, refactoredImpl)

      expect(testCase.getLifecycleState()).toBe('refactor')
    })

    it('should prevent green phase without failing test', () => {
      const workflow = framework.createWorkflow()
      const testCase = framework.createTestCase('should pass', () => {
        expect(true).toBe(true) // Already passing
      })

      expect(() => {
        workflow.green(testCase, () => 'implementation')
      }).toThrow('Cannot move to green phase: test is not failing')
    })
  })

  describe('Test Runner Integration', () => {
    it('should integrate with Vitest runner', async () => {
      const runner = framework.getTestRunner()

      expect(runner.name).toBe('vitest')
      expect(runner.runTests).toBeDefined()
      expect(runner.watchMode).toBeDefined()
    })

    it('should support watch mode for TDD', async () => {
      const runner = framework.getTestRunner()
      const mockCallback = vi.fn()

      runner.watchMode({
        onChange: mockCallback,
        pattern: '**/*.test.ts',
      })

      expect(mockCallback).toBeDefined()
    })
  })
})

// Helper function for testing (will be moved to implementation)
function sum(a: number, b: number): number {
  // This will fail initially, demonstrating TDD
  throw new Error('Not implemented')
}
