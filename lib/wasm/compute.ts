/**
 * Compute WASM Service
 *
 * This module provides high-performance computational tasks using WebAssembly
 * for heavy data processing, analytics, and mathematical operations.
 */

import { observability } from "../observability";
import { shouldUseWASMOptimization } from "./detection";

export interface ComputeWASMConfig {
	maxWorkers: number;
	enableThreads: boolean;
	enableSIMD: boolean;
	memoryLimit: number;
	timeoutMs: number;
	enableProfiling: boolean;
	enableOptimizations: boolean;
}

export interface ComputeTask {
	id: string;
	type: "analytics" | "statistics" | "matrix" | "signal" | "ml" | "crypto";
	operation: string;
	data: any;
	options?: Record<string, any>;
	priority?: "low" | "normal" | "high";
}

export interface ComputeResult {
	taskId: string;
	result: any;
	executionTime: number;
	memoryUsage: number;
	wasmEnabled: boolean;
	error?: string;
	metadata?: Record<string, any>;
}

export interface AnalyticsData {
	values: number[];
	timestamps?: number[];
	labels?: string[];
	metadata?: Record<string, any>;
}

export interface StatisticalSummary {
	count: number;
	mean: number;
	median: number;
	mode: number[];
	standardDeviation: number;
	variance: number;
	min: number;
	max: number;
	range: number;
	quartiles: {
		q1: number;
		q2: number;
		q3: number;
	};
	percentiles: Record<number, number>;
	skewness: number;
	kurtosis: number;
}

export interface ComputeStats {
	isWASMEnabled: boolean;
	workersCount: number;
	activeJobs: number;
	completedJobs: number;
	failedJobs: number;
	averageExecutionTime: number;
	memoryUsage: number;
	cpuUsage: number;
	queueSize: number;
}

/**
 * Compute WASM Engine for high-performance calculations
 */
export class ComputeWASM {
	private isInitialized = false;
	private isWASMEnabled = false;
	private config: ComputeWASMConfig;
	private workers: Worker[] = [];
	private wasmModule: any = null;
	private taskQueue: ComputeTask[] = [];
	private activeTasks: Map<string, ComputeTask> = new Map();
	private stats: ComputeStats;
	private executionTimes: number[] = [];

	constructor(config: Partial<ComputeWASMConfig> = {}) {
		this.config = {
			maxWorkers: navigator.hardwareConcurrency || 4,
			enableThreads: true,
			enableSIMD: true,
			memoryLimit: 128 * 1024 * 1024, // 128MB
			timeoutMs: 30000, // 30 seconds
			enableProfiling: true,
			enableOptimizations: true,
			...config,
		};

		this.stats = {
			isWASMEnabled: false,
			workersCount: 0,
			activeJobs: 0,
			completedJobs: 0,
			failedJobs: 0,
			averageExecutionTime: 0,
			memoryUsage: 0,
			cpuUsage: 0,
			queueSize: 0,
		};
	}

	/**
	 * Initialize the compute engine
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		return observability.trackOperation("wasm.compute.initialize", async () => {
			try {
				// Check if WASM optimization should be used
				if (!shouldUseWASMOptimization("compute")) {
					observability.recordEvent("wasm.compute.fallback-to-js", {
						reason: "WASM optimization disabled",
					});
					await this.initializeJavaScriptFallback();
					this.isInitialized = true;
					this.isWASMEnabled = false;
					return;
				}

				// Try to load compute WASM module
				try {
					await this.loadComputeWASM();
					this.isWASMEnabled = true;
					observability.recordEvent("wasm.compute.wasm-loaded", {
						config: this.config,
					});
				} catch (wasmError) {
					observability.recordError("wasm.compute.wasm-load-failed", wasmError as Error);
					console.warn("Failed to load compute WASM, using JavaScript fallback:", wasmError);
					await this.initializeJavaScriptFallback();
					this.isWASMEnabled = false;
				}

				// Initialize worker pool if threads are enabled
				if (this.config.enableThreads && this.isWASMEnabled) {
					await this.initializeWorkerPool();
				}

				// Start monitoring
				this.startMonitoring();

				this.stats.isWASMEnabled = this.isWASMEnabled;
				this.isInitialized = true;

				observability.recordEvent("wasm.compute.initialized", {
					wasmEnabled: this.isWASMEnabled,
					workersCount: this.workers.length,
					config: this.config,
				});

				console.log("✅ Compute WASM engine initialized");
			} catch (error) {
				observability.recordError("wasm.compute.initialization-failed", error as Error);
				console.warn("Failed to initialize compute WASM engine:", error);
				await this.initializeJavaScriptFallback();
				this.isInitialized = true;
				this.isWASMEnabled = false;
			}
		});
	}

	/**
	 * Load compute WASM module
	 */
	private async loadComputeWASM(): Promise<void> {
		try {
			// Load compute WASM module
			const wasmPath = "/wasm-modules/compute/compute.wasm";
			const wasmResponse = await fetch(wasmPath);

			if (!wasmResponse.ok) {
				throw new Error(`Failed to fetch compute WASM: ${wasmResponse.status}`);
			}

			const wasmBytes = await wasmResponse.arrayBuffer();
			const wasmModule = await WebAssembly.instantiate(wasmBytes, {
				env: {
					memory: new WebAssembly.Memory({
						initial: Math.floor(this.config.memoryLimit / (64 * 1024)),
						maximum: Math.floor(this.config.memoryLimit / (64 * 1024)) * 2,
						shared: this.config.enableThreads,
					}),
					Math_sqrt: Math.sqrt,
					Math_pow: Math.pow,
					Math_sin: Math.sin,
					Math_cos: Math.cos,
					Math_log: Math.log,
					Math_exp: Math.exp,
					console_log: (ptr: number, len: number) => {
						console.log(`Compute WASM: ${ptr}-${len}`);
					},
				},
			});

			this.wasmModule = wasmModule.instance;
			console.log("✅ Compute WASM module loaded successfully");
		} catch (error) {
			throw new Error(`Failed to load compute WASM: ${error}`);
		}
	}

	/**
	 * Initialize JavaScript fallback
	 */
	private async initializeJavaScriptFallback(): Promise<void> {
		// Create JavaScript implementations of compute functions
		this.wasmModule = {
			// Statistical functions
			calculate_mean: (data: Float64Array) => {
				return data.reduce((sum, val) => sum + val, 0) / data.length;
			},
			calculate_std: (data: Float64Array) => {
				const mean = this.wasmModule.calculate_mean(data);
				const variance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;
				return Math.sqrt(variance);
			},
			// Matrix operations
			matrix_multiply: (a: Float64Array, b: Float64Array, rows: number, cols: number) => {
				const result = new Float64Array(rows * cols);
				// Simple matrix multiplication
				for (let i = 0; i < rows; i++) {
					for (let j = 0; j < cols; j++) {
						let sum = 0;
						for (let k = 0; k < cols; k++) {
							sum += a[i * cols + k] * b[k * cols + j];
						}
						result[i * cols + j] = sum;
					}
				}
				return result;
			},
			// Signal processing
			fft: (data: Float64Array) => {
				// Simple DFT implementation (not optimized)
				const N = data.length;
				const result = new Float64Array(N * 2); // Real and imaginary parts

				for (let k = 0; k < N; k++) {
					let realSum = 0;
					let imagSum = 0;

					for (let n = 0; n < N; n++) {
						const angle = (-2 * Math.PI * k * n) / N;
						realSum += data[n] * Math.cos(angle);
						imagSum += data[n] * Math.sin(angle);
					}

					result[k * 2] = realSum;
					result[k * 2 + 1] = imagSum;
				}

				return result;
			},
		};
	}

	/**
	 * Initialize worker pool for parallel processing
	 */
	private async initializeWorkerPool(): Promise<void> {
		const workerCount = Math.min(this.config.maxWorkers, navigator.hardwareConcurrency || 4);

		for (let i = 0; i < workerCount; i++) {
			try {
				const worker = new Worker(new URL("../workers/compute-worker.ts", import.meta.url), {
					type: "module",
				});

				worker.onmessage = (event) => {
					this.handleWorkerMessage(event.data);
				};

				worker.onerror = (error) => {
					observability.recordError("wasm.compute.worker-error", error as any);
				};

				this.workers.push(worker);
			} catch (error) {
				console.warn(`Failed to create worker ${i}:`, error);
			}
		}

		this.stats.workersCount = this.workers.length;

		observability.recordEvent("wasm.compute.worker-pool-initialized", {
			workersCount: this.workers.length,
			requestedWorkers: workerCount,
		});
	}

	/**
	 * Handle worker messages
	 */
	private handleWorkerMessage(message: any): void {
		const { taskId, result, error, executionTime, memoryUsage } = message;

		if (this.activeTasks.has(taskId)) {
			this.activeTasks.delete(taskId);
			this.stats.activeJobs--;

			if (error) {
				this.stats.failedJobs++;
				observability.recordError("wasm.compute.task-failed", new Error(error));
			} else {
				this.stats.completedJobs++;
				this.executionTimes.push(executionTime);

				if (this.executionTimes.length > 100) {
					this.executionTimes = this.executionTimes.slice(-50);
				}
			}
		}

		// Process next task in queue
		this.processQueue();
	}

	/**
	 * Start monitoring and maintenance tasks
	 */
	private startMonitoring(): void {
		setInterval(() => {
			this.updateStats();
		}, 5000); // Every 5 seconds

		// Queue processing
		setInterval(() => {
			this.processQueue();
		}, 100); // Every 100ms
	}

	/**
	 * Process task queue
	 */
	private processQueue(): void {
		while (this.taskQueue.length > 0 && this.stats.activeJobs < this.config.maxWorkers) {
			const task = this.taskQueue.shift()!;
			this.executeTask(task);
		}
	}

	/**
	 * Execute a compute task
	 */
	private async executeTask(task: ComputeTask): Promise<void> {
		this.activeTasks.set(task.id, task);
		this.stats.activeJobs++;

		if (this.workers.length > 0) {
			// Use worker for parallel execution
			const worker = this.workers[this.stats.activeJobs % this.workers.length];
			worker.postMessage({
				taskId: task.id,
				type: task.type,
				operation: task.operation,
				data: task.data,
				options: task.options,
			});
		} else {
			// Execute in main thread
			try {
				const result = await this.executeInMainThread(task);
				this.handleWorkerMessage({
					taskId: task.id,
					result,
					executionTime: performance.now(),
					memoryUsage: 0,
				});
			} catch (error) {
				this.handleWorkerMessage({
					taskId: task.id,
					error: (error as Error).message,
					executionTime: performance.now(),
					memoryUsage: 0,
				});
			}
		}
	}

	/**
	 * Execute task in main thread
	 */
	private async executeInMainThread(task: ComputeTask): Promise<any> {
		return observability.trackOperation(`wasm.compute.${task.operation}`, async () => {
			switch (task.type) {
				case "statistics":
					return this.executeStatisticalTask(task);
				case "analytics":
					return this.executeAnalyticsTask(task);
				case "matrix":
					return this.executeMatrixTask(task);
				case "signal":
					return this.executeSignalTask(task);
				case "ml":
					return this.executeMLTask(task);
				case "crypto":
					return this.executeCryptoTask(task);
				default:
					throw new Error(`Unknown task type: ${task.type}`);
			}
		});
	}

	/**
	 * Execute statistical computation task
	 */
	private executeStatisticalTask(task: ComputeTask): any {
		const { operation, data } = task;
		const values = new Float64Array(data.values);

		switch (operation) {
			case "summary":
				return this.calculateStatisticalSummary(values);
			case "correlation":
				return this.calculateCorrelation(values, new Float64Array(data.values2));
			case "regression":
				return this.calculateLinearRegression(values, new Float64Array(data.values2));
			default:
				throw new Error(`Unknown statistical operation: ${operation}`);
		}
	}

	/**
	 * Calculate comprehensive statistical summary
	 */
	private calculateStatisticalSummary(values: Float64Array): StatisticalSummary {
		const sorted = Array.from(values).sort((a, b) => a - b);
		const n = values.length;

		// Basic statistics
		const mean = this.wasmModule.calculate_mean(values);
		const std = this.wasmModule.calculate_std(values);
		const variance = std * std;

		// Median
		const median =
			n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

		// Mode (most frequent values)
		const frequency = new Map<number, number>();
		for (const value of values) {
			frequency.set(value, (frequency.get(value) || 0) + 1);
		}
		const maxFreq = Math.max(...frequency.values());
		const mode = Array.from(frequency.entries())
			.filter(([_, freq]) => freq === maxFreq)
			.map(([value, _]) => value);

		// Quartiles
		const q1 = sorted[Math.floor(n * 0.25)];
		const q3 = sorted[Math.floor(n * 0.75)];

		// Percentiles
		const percentiles: Record<number, number> = {};
		[5, 10, 25, 50, 75, 90, 95, 99].forEach((p) => {
			percentiles[p] = sorted[Math.floor((n * p) / 100)];
		});

		// Skewness and kurtosis
		const skewness = this.calculateSkewness(values, mean, std);
		const kurtosis = this.calculateKurtosis(values, mean, std);

		return {
			count: n,
			mean,
			median,
			mode,
			standardDeviation: std,
			variance,
			min: sorted[0],
			max: sorted[n - 1],
			range: sorted[n - 1] - sorted[0],
			quartiles: { q1, q2: median, q3 },
			percentiles,
			skewness,
			kurtosis,
		};
	}

	/**
	 * Calculate skewness
	 */
	private calculateSkewness(values: Float64Array, mean: number, std: number): number {
		const n = values.length;
		let sum = 0;

		for (const value of values) {
			sum += ((value - mean) / std) ** 3;
		}

		return (n / ((n - 1) * (n - 2))) * sum;
	}

	/**
	 * Calculate kurtosis
	 */
	private calculateKurtosis(values: Float64Array, mean: number, std: number): number {
		const n = values.length;
		let sum = 0;

		for (const value of values) {
			sum += ((value - mean) / std) ** 4;
		}

		return (
			((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
			(3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3))
		);
	}

	/**
	 * Calculate correlation coefficient
	 */
	private calculateCorrelation(x: Float64Array, y: Float64Array): number {
		if (x.length !== y.length) {
			throw new Error("Arrays must have the same length");
		}

		const n = x.length;
		const meanX = this.wasmModule.calculate_mean(x);
		const meanY = this.wasmModule.calculate_mean(y);

		let numerator = 0;
		let sumXSquared = 0;
		let sumYSquared = 0;

		for (let i = 0; i < n; i++) {
			const deltaX = x[i] - meanX;
			const deltaY = y[i] - meanY;

			numerator += deltaX * deltaY;
			sumXSquared += deltaX * deltaX;
			sumYSquared += deltaY * deltaY;
		}

		const denominator = Math.sqrt(sumXSquared * sumYSquared);
		return denominator === 0 ? 0 : numerator / denominator;
	}

	/**
	 * Calculate linear regression
	 */
	private calculateLinearRegression(
		x: Float64Array,
		y: Float64Array
	): {
		slope: number;
		intercept: number;
		rSquared: number;
	} {
		if (x.length !== y.length) {
			throw new Error("Arrays must have the same length");
		}

		const n = x.length;
		const meanX = this.wasmModule.calculate_mean(x);
		const meanY = this.wasmModule.calculate_mean(y);

		let numerator = 0;
		let denominator = 0;

		for (let i = 0; i < n; i++) {
			const deltaX = x[i] - meanX;
			numerator += deltaX * (y[i] - meanY);
			denominator += deltaX * deltaX;
		}

		const slope = denominator === 0 ? 0 : numerator / denominator;
		const intercept = meanY - slope * meanX;

		// Calculate R-squared
		let totalSumSquares = 0;
		let residualSumSquares = 0;

		for (let i = 0; i < n; i++) {
			const predicted = slope * x[i] + intercept;
			totalSumSquares += (y[i] - meanY) ** 2;
			residualSumSquares += (y[i] - predicted) ** 2;
		}

		const rSquared = totalSumSquares === 0 ? 1 : 1 - residualSumSquares / totalSumSquares;

		return { slope, intercept, rSquared };
	}

	/**
	 * Execute analytics task
	 */
	private executeAnalyticsTask(task: ComputeTask): any {
		// Placeholder for analytics operations
		return { result: "analytics completed" };
	}

	/**
	 * Execute matrix task
	 */
	private executeMatrixTask(task: ComputeTask): any {
		const { operation, data } = task;

		switch (operation) {
			case "multiply":
				return this.wasmModule.matrix_multiply(
					new Float64Array(data.matrixA),
					new Float64Array(data.matrixB),
					data.rows,
					data.cols
				);
			default:
				throw new Error(`Unknown matrix operation: ${operation}`);
		}
	}

	/**
	 * Execute signal processing task
	 */
	private executeSignalTask(task: ComputeTask): any {
		const { operation, data } = task;

		switch (operation) {
			case "fft":
				return this.wasmModule.fft(new Float64Array(data.signal));
			default:
				throw new Error(`Unknown signal operation: ${operation}`);
		}
	}

	/**
	 * Execute machine learning task
	 */
	private executeMLTask(task: ComputeTask): any {
		// Placeholder for ML operations
		return { result: "ml completed" };
	}

	/**
	 * Execute cryptographic task
	 */
	private executeCryptoTask(task: ComputeTask): any {
		// Placeholder for crypto operations
		return { result: "crypto completed" };
	}

	/**
	 * Submit a compute task
	 */
	async submitTask(task: Omit<ComputeTask, "id">): Promise<string> {
		const taskWithId: ComputeTask = {
			id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			priority: "normal",
			...task,
		};

		// Add to queue based on priority
		if (taskWithId.priority === "high") {
			this.taskQueue.unshift(taskWithId);
		} else {
			this.taskQueue.push(taskWithId);
		}

		this.stats.queueSize = this.taskQueue.length;

		observability.recordEvent("wasm.compute.task-submitted", {
			taskId: taskWithId.id,
			type: taskWithId.type,
			operation: taskWithId.operation,
			priority: taskWithId.priority,
			queueSize: this.stats.queueSize,
		});

		// Start processing if not already running
		this.processQueue();

		return taskWithId.id;
	}

	/**
	 * Update internal statistics
	 */
	private updateStats(): void {
		this.stats.queueSize = this.taskQueue.length;
		this.stats.averageExecutionTime =
			this.executionTimes.length > 0
				? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
				: 0;

		// Estimate memory and CPU usage
		this.stats.memoryUsage = this.activeTasks.size * 1024 * 1024; // Rough estimate
		this.stats.cpuUsage = (this.stats.activeJobs / this.config.maxWorkers) * 100;
	}

	/**
	 * Get comprehensive statistics
	 */
	getStats(): ComputeStats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		// Terminate all workers
		for (const worker of this.workers) {
			worker.terminate();
		}
		this.workers = [];

		// Clear queues and tasks
		this.taskQueue = [];
		this.activeTasks.clear();
		this.executionTimes = [];

		// Reset stats
		this.stats = {
			isWASMEnabled: false,
			workersCount: 0,
			activeJobs: 0,
			completedJobs: 0,
			failedJobs: 0,
			averageExecutionTime: 0,
			memoryUsage: 0,
			cpuUsage: 0,
			queueSize: 0,
		};

		observability.recordEvent("wasm.compute.cleanup-completed", {});

		console.log("✅ Compute WASM engine cleaned up");
	}
}

// Export utility functions
export function createComputeEngine(config?: Partial<ComputeWASMConfig>): ComputeWASM {
	return new ComputeWASM(config);
}

// Global compute engine instance
let globalComputeEngine: ComputeWASM | null = null;

export function getComputeEngine(config?: Partial<ComputeWASMConfig>): ComputeWASM {
	if (!globalComputeEngine) {
		globalComputeEngine = new ComputeWASM(config);
	}
	return globalComputeEngine;
}

// Compute manager for multiple engines
export class ComputeManager {
	private engines: Map<string, ComputeWASM> = new Map();

	getComputeEngine(name: string = "default", config?: Partial<ComputeWASMConfig>): ComputeWASM {
		if (!this.engines.has(name)) {
			this.engines.set(name, new ComputeWASM(config));
		}
		return this.engines.get(name)!;
	}

	async initializeAll(): Promise<void> {
		const initPromises = Array.from(this.engines.values()).map((engine) => engine.initialize());
		await Promise.all(initPromises);
	}

	cleanupAll(): void {
		for (const engine of this.engines.values()) {
			engine.cleanup();
		}
		this.engines.clear();
	}
}

export const computeManager = new ComputeManager();
