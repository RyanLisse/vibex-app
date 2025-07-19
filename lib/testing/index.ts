// TDD Framework - Main Export File
// This file provides a comprehensive TDD testing framework implementation

// Core TDD Framework
export {
  TDDFramework,
  TestCase,
  TestSuite,
  TDDWorkflow,
  VitestRunner,
  type TestStatus,
  type LifecycleState,
  type TestResult,
  type TestRunner
} from './tdd-framework/core'

// Test Data Builders
export {
  TestDataBuilder,
  UserBuilder,
  ProjectBuilder,
  ApiResponseBuilder,
  BuilderFactory,
  TestDataGenerator,
  type User,
  type Project,
  type ApiResponse
} from './builders/test-data-builder'

// Custom Assertions
export './assertions/custom-matchers'

// Test Lifecycle Management
export {
  TestLifecycleManager,
  ResourceManager,
  SetupTeardownOrchestrator,
  LifecyclePatterns,
  type TestHook,
  type Resource,
  type TestContext
} from './lifecycle/test-lifecycle'

// CLI Tools
export {
  TDDCli,
  TestGenerator,
  WorkflowAutomation,
  type CLICommand,
  type TestGenerationOptions,
  type IntegrationTestOptions,
  type TDDCycleOptions,
  type ScaffoldOptions,
  type ScaffoldResult
} from './cli/tdd-cli'

// Performance Testing
export {
  PerformanceBenchmark,
  MemoryProfiler,
  PerformanceReporter,
  type BenchmarkOptions,
  type BenchmarkResult,
  type MemoryUsage,
  type MemorySnapshot,
  type PerformanceThresholds,
  type RegressionResult,
  type CoverageReport
} from './performance/performance-testing'

// Test Documentation
export {
  TestSpecificationGenerator,
  CoverageVisualizer,
  DocumentationGenerator,
  type TestSpecification,
  type TestDocumentation,
  type CoverageData,
  type CoverageSummary,
  type CoverageAnalysis
} from './documentation/test-documentation'

// Utility Functions and Helpers
export const TDDTestingFramework = {
  // Quick setup for common TDD patterns
  createTestSuite: (name: string) => {
    const framework = new TDDFramework()
    return framework.createTestSuite(name)
  },

  // Factory for test data
  createDataFactory: () => {
    return TestDataBuilder.createFactory()
  },

  // Setup TDD workflow
  createWorkflow: () => {
    const framework = new TDDFramework()
    return framework.createWorkflow()
  },

  // Performance benchmarking
  createBenchmark: () => {
    return new PerformanceBenchmark()
  },

  // Memory profiling
  createMemoryProfiler: () => {
    return new MemoryProfiler()
  },

  // CLI for test generation
  createCLI: () => {
    return new TDDCli()
  },

  // Test specification generator
  createSpecGenerator: () => {
    return new TestSpecificationGenerator()
  },

  // Coverage visualization
  createCoverageVisualizer: () => {
    return new CoverageVisualizer()
  }
}

// Re-export Vitest types for convenience
export type {
  MockedFunction,
  MockedObject,
  MockedClass
} from 'vitest'

// Convenience re-exports from testing libraries
export {
  describe,
  it,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi
} from 'vitest'

export {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup
} from '@testing-library/react'

// Default configuration
export const TDDConfig = {
  // Default performance thresholds
  performanceThresholds: {
    maxTime: 100, // 100ms
    targetTime: 50, // 50ms
    maxMemory: 100 * 1024 * 1024, // 100MB
    targetMemory: 50 * 1024 * 1024 // 50MB
  },

  // Default benchmark options
  benchmarkOptions: {
    iterations: 10,
    warmupIterations: 3,
    timeout: 30000
  },

  // Coverage thresholds
  coverageThresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  },

  // Test generation templates
  testTemplates: {
    component: 'react-component',
    hook: 'react-hook',
    service: 'service-class',
    api: 'api-endpoint',
    utility: 'utility-function'
  }
}