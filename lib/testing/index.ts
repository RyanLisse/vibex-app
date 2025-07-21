// TDD Framework - Main Export File
// This file provides a comprehensive TDD testing framework implementation

// Custom Assertions
export * from "./assertions/custom-matchers";

// Test Data Builders
export {
	type ApiResponse,
	ApiResponseBuilder,
	UserBuilder,
} from "./builders/test-data-builder";
// CLI Tools
export {
	type CLICommand,
	type IntegrationTestOptions,
	type ScaffoldOptions,
	type ScaffoldResult,
	WorkflowAutomation,
} from "./cli/tdd-cli";
// Test Documentation
export {
	type CoverageAnalysis,
	type CoverageData,
	type CoverageSummary,
	CoverageVisualizer,
	TestSpecificationGenerator,
} from "./documentation/test-documentation";
// Test Lifecycle Management
export { TestLifecycleManager } from "./lifecycle/test-lifecycle";

// Performance Testing
export type {
	BenchmarkOptions,
	BenchmarkResult,
	CoverageReport,
	RegressionResult,
} from "./performance/performance-testing";
// Core TDD Framework
export {
	type LifecycleState,
	TDDFramework,
	VitestRunner,
} from "./tdd-framework/core";

// Utility Functions and Helpers
export const TDDTestingFramework = {
	// Quick setup for common TDD patterns
	createTestSuite: (name: string) => {
		const framework = new TDDFramework();
		return framework.createTestSuite(name);
	},

	// Factory for test data
	createDataFactory: () => {
		return TestDataBuilder.createFactory();
	},

	// Setup TDD workflow
	createWorkflow: () => {
		const framework = new TDDFramework();
		return framework.createWorkflow();
	},

	// Performance benchmarking
	createBenchmark: () => {
		return new PerformanceBenchmark();
	},

	// Memory profiling
	createMemoryProfiler: () => {
		return new MemoryProfiler();
	},

	// CLI for test generation
	createCLI: () => {
		return new TDDCli();
	},

	// Test specification generator
	createSpecGenerator: () => {
		return new TestSpecificationGenerator();
	},

	// Coverage visualization
	createCoverageVisualizer: () => {
		return new CoverageVisualizer();
	},
};

export {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
// Re-export Vitest types for convenience
export type {
	MockedClass,
	MockedObject,
} from "vitest";
// Convenience re-exports from testing libraries
export {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	test,
	vi,
} from "vitest";

// Default configuration
export const TDDConfig = {
	// Default performance thresholds
	performanceThresholds: {
		maxTime: 100, // 100ms
		targetTime: 50, // 50ms
		maxMemory: 100 * 1024 * 1024, // 100MB
		targetMemory: 50 * 1024 * 1024, // 50MB
	},

	// Default benchmark options
	benchmarkOptions: {
		iterations: 10,
		warmupIterations: 3,
		timeout: 30_000,
	},

	// Coverage thresholds
	coverageThresholds: {
		statements: 80,
		branches: 80,
		functions: 80,
		lines: 80,
	},

	// Test generation templates
	testTemplates: {
		component: "react-component",
		hook: "react-hook",
		service: "service-class",
		api: "api-endpoint",
		utility: "utility-function",
	},
};
