/**
 * WASM Compute Module Integration Tests
 *
 * Comprehensive test suite for WASM compute operations including
 * performance benchmarks, fallback scenarios, and statistical operations
 */

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest";
import {
	type AnalyticsData,
	type ComputeResult,
	type ComputeTask,
	ComputeWASM,
	type ComputeWASMConfig,
	computeManager,
	createComputeEngine,
	getComputeEngine,
	type StatisticalSummary,
} from "../../../lib/wasm/compute";
