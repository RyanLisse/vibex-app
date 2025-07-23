/**
 * TestLifecycleManager - Comprehensive Test Lifecycle Management
 * 
 * Manages test setup, execution, cleanup, and resource coordination
 */

export interface TestLifecycleConfig {
	timeout: number;
	retries: number;
	parallel: boolean;
	cleanup: boolean;
	isolation: boolean;
	resources: ResourceConfig[];
}

export interface ResourceConfig {
	name: string;
	type: "database" | "cache" | "file" | "network" | "service";
	setup: () => Promise<void>;
	cleanup: () => Promise<void>;
	healthCheck?: () => Promise<boolean>;
}

export interface TestContext {
	id: string;
	name: string;
	suite: string;
	startTime: Date;
	endTime?: Date;
	status: "pending" | "running" | "passed" | "failed" | "skipped";
	resources: Map<string, unknown>;
	metadata: Record<string, unknown>;
}

export interface TestResult {
	context: TestContext;
	duration: number;
	error?: Error;
	logs: LogEntry[];
	metrics: TestMetrics;
}

export interface LogEntry {
	timestamp: Date;
	level: "debug" | "info" | "warn" | "error";
	message: string;
	data?: unknown;
}

export interface TestMetrics {
	memoryUsage: number;
	cpuTime: number;
	networkCalls: number;
	databaseQueries: number;
	cacheHits: number;
	cacheMisses: number;
}

export interface TestSuiteResult {
	name: string;
	tests: TestResult[];
	totalDuration: number;
	passCount: number;
	failCount: number;
	skipCount: number;
	coverage?: number;
}

export class TestLifecycleManager {
	private config: TestLifecycleConfig;
	private activeTests: Map<string, TestContext> = new Map();
	private resources: Map<string, unknown> = new Map();
	private logs: LogEntry[] = [];
	private metrics: Map<string, TestMetrics> = new Map();

	constructor(config: Partial<TestLifecycleConfig> = {}) {
		this.config = {
			timeout: 30000,
			retries: 0,
			parallel: false,
			cleanup: true,
			isolation: true,
			resources: [],
			...config,
		};
	}

	/**
	 * Initialize test environment
	 */
	async initialize(): Promise<void> {
		this.log("info", "Initializing test environment");

		// Setup resources
		for (const resourceConfig of this.config.resources) {
			try {
				await this.setupResource(resourceConfig);
				this.log("info", `Resource ${resourceConfig.name} initialized`);
			} catch (error) {
				this.log("error", `Failed to initialize resource ${resourceConfig.name}`, error);
				throw error;
			}
		}

		this.log("info", "Test environment initialized successfully");
	}

	/**
	 * Create test context
	 */
	createTestContext(name: string, suite: string): TestContext {
		const context: TestContext = {
			id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			name,
			suite,
			startTime: new Date(),
			status: "pending",
			resources: new Map(),
			metadata: {},
		};

		this.activeTests.set(context.id, context);
		return context;
	}

	/**
	 * Start test execution
	 */
	async startTest(context: TestContext): Promise<void> {
		context.status = "running";
		context.startTime = new Date();

		this.log("info", `Starting test: ${context.name}`, { testId: context.id });

		// Setup test-specific resources if isolation is enabled
		if (this.config.isolation) {
			await this.setupTestResources(context);
		}

		// Start metrics collection
		this.startMetricsCollection(context.id);
	}

	/**
	 * Complete test execution
	 */
	async completeTest(context: TestContext, error?: Error): Promise<TestResult> {
		context.endTime = new Date();
		context.status = error ? "failed" : "passed";

		const duration = context.endTime.getTime() - context.startTime.getTime();
		const metrics = this.stopMetricsCollection(context.id);

		const result: TestResult = {
			context,
			duration,
			error,
			logs: this.getTestLogs(context.id),
			metrics,
		};

		// Cleanup test resources if isolation is enabled
		if (this.config.isolation && this.config.cleanup) {
			await this.cleanupTestResources(context);
		}

		this.activeTests.delete(context.id);
		this.log("info", `Completed test: ${context.name}`, { 
			testId: context.id, 
			status: context.status,
			duration 
		});

		return result;
	}

	/**
	 * Skip test
	 */
	skipTest(context: TestContext, reason: string): TestResult {
		context.status = "skipped";
		context.endTime = new Date();

		const result: TestResult = {
			context,
			duration: 0,
			logs: [{ 
				timestamp: new Date(), 
				level: "info", 
				message: `Test skipped: ${reason}` 
			}],
			metrics: this.getEmptyMetrics(),
		};

		this.activeTests.delete(context.id);
		return result;
	}

	/**
	 * Run test with lifecycle management
	 */
	async runTest<T>(
		name: string,
		suite: string,
		testFn: (context: TestContext) => Promise<T>
	): Promise<TestResult> {
		const context = this.createTestContext(name, suite);
		
		try {
			await this.startTest(context);
			
			// Run test with timeout
			const result = await this.withTimeout(
				testFn(context),
				this.config.timeout
			);

			return await this.completeTest(context);
		} catch (error) {
			return await this.completeTest(context, error as Error);
		}
	}

	/**
	 * Run test suite
	 */
	async runSuite(
		suiteName: string,
		tests: Array<{ name: string; fn: (context: TestContext) => Promise<void> }>
	): Promise<TestSuiteResult> {
		const startTime = Date.now();
		const results: TestResult[] = [];

		this.log("info", `Starting test suite: ${suiteName}`);

		if (this.config.parallel) {
			// Run tests in parallel
			const promises = tests.map(test => 
				this.runTest(test.name, suiteName, test.fn)
			);
			results.push(...await Promise.all(promises));
		} else {
			// Run tests sequentially
			for (const test of tests) {
				const result = await this.runTest(test.name, suiteName, test.fn);
				results.push(result);
			}
		}

		const totalDuration = Date.now() - startTime;
		const passCount = results.filter(r => r.context.status === "passed").length;
		const failCount = results.filter(r => r.context.status === "failed").length;
		const skipCount = results.filter(r => r.context.status === "skipped").length;

		const suiteResult: TestSuiteResult = {
			name: suiteName,
			tests: results,
			totalDuration,
			passCount,
			failCount,
			skipCount,
		};

		this.log("info", `Completed test suite: ${suiteName}`, {
			totalTests: results.length,
			passed: passCount,
			failed: failCount,
			skipped: skipCount,
			duration: totalDuration,
		});

		return suiteResult;
	}

	/**
	 * Cleanup all resources
	 */
	async cleanup(): Promise<void> {
		this.log("info", "Starting cleanup");

		// Cleanup active tests
		for (const context of this.activeTests.values()) {
			if (this.config.isolation) {
				await this.cleanupTestResources(context);
			}
		}

		// Cleanup global resources
		for (const resourceConfig of this.config.resources) {
			try {
				await resourceConfig.cleanup();
				this.log("info", `Resource ${resourceConfig.name} cleaned up`);
			} catch (error) {
				this.log("error", `Failed to cleanup resource ${resourceConfig.name}`, error);
			}
		}

		this.activeTests.clear();
		this.resources.clear();
		this.log("info", "Cleanup completed");
	}

	/**
	 * Get test logs
	 */
	getLogs(testId?: string): LogEntry[] {
		if (testId) {
			return this.logs.filter(log => 
				log.data && typeof log.data === 'object' && 'testId' in log.data && log.data.testId === testId
			);
		}
		return [...this.logs];
	}

	/**
	 * Add resource configuration
	 */
	addResource(config: ResourceConfig): void {
		this.config.resources.push(config);
	}

	/**
	 * Health check all resources
	 */
	async healthCheck(): Promise<Record<string, boolean>> {
		const results: Record<string, boolean> = {};

		for (const resourceConfig of this.config.resources) {
			if (resourceConfig.healthCheck) {
				try {
					results[resourceConfig.name] = await resourceConfig.healthCheck();
				} catch {
					results[resourceConfig.name] = false;
				}
			} else {
				results[resourceConfig.name] = true; // Assume healthy if no check
			}
		}

		return results;
	}

	private async setupResource(config: ResourceConfig): Promise<void> {
		await config.setup();
		this.resources.set(config.name, { config, initialized: true });
	}

	private async setupTestResources(context: TestContext): Promise<void> {
		// Create isolated resources for this test
		for (const resourceConfig of this.config.resources) {
			if (resourceConfig.type === "database" || resourceConfig.type === "cache") {
				// Create test-specific instance
				const testResource = `${resourceConfig.name}-${context.id}`;
				context.resources.set(resourceConfig.name, testResource);
			}
		}
	}

	private async cleanupTestResources(context: TestContext): Promise<void> {
		// Cleanup test-specific resources
		for (const [name, resource] of context.resources) {
			try {
				// Perform cleanup based on resource type
				this.log("debug", `Cleaning up test resource: ${name}`, { testId: context.id });
			} catch (error) {
				this.log("error", `Failed to cleanup test resource: ${name}`, error);
			}
		}
		context.resources.clear();
	}

	private startMetricsCollection(testId: string): void {
		const metrics: TestMetrics = {
			memoryUsage: process.memoryUsage().heapUsed,
			cpuTime: process.cpuUsage().user,
			networkCalls: 0,
			databaseQueries: 0,
			cacheHits: 0,
			cacheMisses: 0,
		};

		this.metrics.set(testId, metrics);
	}

	private stopMetricsCollection(testId: string): TestMetrics {
		const startMetrics = this.metrics.get(testId) || this.getEmptyMetrics();
		const currentMemory = process.memoryUsage().heapUsed;
		const currentCpu = process.cpuUsage().user;

		const finalMetrics: TestMetrics = {
			...startMetrics,
			memoryUsage: currentMemory - startMetrics.memoryUsage,
			cpuTime: currentCpu - startMetrics.cpuTime,
		};

		this.metrics.delete(testId);
		return finalMetrics;
	}

	private getEmptyMetrics(): TestMetrics {
		return {
			memoryUsage: 0,
			cpuTime: 0,
			networkCalls: 0,
			databaseQueries: 0,
			cacheHits: 0,
			cacheMisses: 0,
		};
	}

	private getTestLogs(testId: string): LogEntry[] {
		return this.logs.filter(log => 
			log.data && typeof log.data === 'object' && 'testId' in log.data && log.data.testId === testId
		);
	}

	private log(level: LogEntry["level"], message: string, data?: unknown): void {
		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			message,
			data,
		};

		this.logs.push(entry);

		// Also log to console in development
		if (process.env.NODE_ENV !== "test") {
			console[level === "error" ? "error" : "log"](`[${level.toUpperCase()}] ${message}`, data || "");
		}
	}

	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
		});

		return Promise.race([promise, timeoutPromise]);
	}
}
