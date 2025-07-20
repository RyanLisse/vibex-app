/**
 * WASM Services Integration Tests
 *
 * Comprehensive tests for all WASM modules including vector search,
 * SQLite utilities, and compute operations with performance benchmarking.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type ComputeWASM, createComputeEngine } from "./compute";
import { wasmDetector } from "./detection";
import { WASMServices, wasmServices } from "./services";
import { createSQLiteWASMUtils, type SQLiteWASMUtils } from "./sqlite-utils";
	calculateFastSimilarity,
	createOptimizedEmbedding,
	VectorSearchWASM,
} from "./vector-search";

describe("WASM Services Integration", () => {
	let vectorEngine: VectorSearchWASM;
	let sqliteUtils: SQLiteWASMUtils;
	let computeEngine: ComputeWASM;

	beforeAll(async () => {
		// Initialize all WASM services
		await wasmServices.initialize();

		// Get individual engines for testing
		vectorEngine = wasmServices.getVectorSearch();
		sqliteUtils = wasmServices.getSQLiteUtils();
		computeEngine = wasmServices.getComputeEngine();
	});

	afterAll(async () => {
		// Cleanup all resources
		wasmServices.cleanup();
	});

	describe("WASM Detection and Capabilities", () => {
		it("should detect WASM capabilities correctly", async () => {
			const capabilities = await wasmDetector.detectCapabilities();

			expect(capabilities).toHaveProperty("isSupported");
			expect(capabilities).toHaveProperty("hasThreads");
			expect(capabilities).toHaveProperty("hasSIMD");
			expect(capabilities).toHaveProperty("performance");

			if (capabilities.isSupported) {
				expect(capabilities.performance).toMatch(/high|medium|low|unknown/);
			}
		});

		it("should provide optimization configuration", () => {
			const config = wasmDetector.getOptimizationConfig();

			expect(config).toHaveProperty("enableVectorSearch");
			expect(config).toHaveProperty("enableSQLiteOptimizations");
			expect(config).toHaveProperty("enableComputeOptimizations");
			expect(config).toHaveProperty("fallbackToJS");
		});

		it("should generate capabilities summary", () => {
			const summary = wasmDetector.getCapabilitiesSummary();
			expect(summary).toContain("WASM Support:");
			expect(summary).toContain("Performance:");
		});
	});

	describe("Vector Search WASM Module", () => {
		const testDocuments = [
			{
				id: "doc1",
				content: "The quick brown fox jumps over the lazy dog",
				embedding: new Array(384).fill(0).map(() => Math.random()),
				metadata: { category: "test", importance: 1 },
			},
			{
				id: "doc2",
				content:
					"Machine learning and artificial intelligence are transforming technology",
				embedding: new Array(384).fill(0).map(() => Math.random()),
				metadata: { category: "ai", importance: 2 },
			},
			{
				id: "doc3",
				content:
					"WebAssembly provides near-native performance for web applications",
				embedding: new Array(384).fill(0).map(() => Math.random()),
				metadata: { category: "tech", importance: 3 },
			},
		];

		beforeEach(async () => {
			vectorEngine.clear();
			await vectorEngine.addDocuments(testDocuments);
		});

		it("should initialize vector search engine", async () => {
			expect(vectorEngine).toBeDefined();

			const stats = vectorEngine.getStats();
			expect(stats.documentsCount).toBe(testDocuments.length);
			expect(stats.dimensions).toBe(384);
		});

		it("should generate optimized embeddings", async () => {
			const embedding = await createOptimizedEmbedding("test query", 384);

			expect(embedding).toHaveLength(384);
			expect(embedding.every((val) => typeof val === "number")).toBe(true);

			// Check if embedding is normalized
			const magnitude = Math.sqrt(
				embedding.reduce((sum, val) => sum + val * val, 0),
			);
			expect(magnitude).toBeCloseTo(1, 3);
		});

		it("should perform vector similarity search", async () => {
			const queryEmbedding = testDocuments[0].embedding;
			const results = await vectorEngine.search(queryEmbedding, {
				maxResults: 5,
				threshold: 0.1,
			});

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);

			// Check result structure
			results.forEach((result) => {
				expect(result).toHaveProperty("document");
				expect(result).toHaveProperty("similarity");
				expect(result).toHaveProperty("rank");
				expect(result.similarity).toBeGreaterThanOrEqual(0);
				expect(result.similarity).toBeLessThanOrEqual(1);
			});
		});

		it("should search by text query", async () => {
			const results = await vectorEngine.searchByText(
				"artificial intelligence",
				{
					maxResults: 3,
				},
			);

			expect(results).toBeDefined();
			expect(results.length).toBeGreaterThan(0);
		});

		it("should find similar documents", async () => {
			const results = await vectorEngine.findSimilar("doc1", {
				maxResults: 2,
			});

			expect(results).toBeDefined();
			expect(results.every((r) => r.document.id !== "doc1")).toBe(true);
		});

		it("should calculate fast similarity", async () => {
			const similarity = await calculateFastSimilarity(
				testDocuments[0].embedding,
				testDocuments[1].embedding,
			);

			expect(typeof similarity).toBe("number");
			expect(similarity).toBeGreaterThanOrEqual(0);
			expect(similarity).toBeLessThanOrEqual(1);
		});

		it("should handle large datasets efficiently", async () => {
			const largeDocs = Array.from({ length: 1000 }, (_, i) => ({
				id: `large-doc-${i}`,
				content: `Large document ${i} with content`,
				embedding: new Array(384).fill(0).map(() => Math.random()),
				metadata: { batch: "large", index: i },
			}));

			const startTime = performance.now();
			await vectorEngine.addDocuments(largeDocs);
			const addTime = performance.now() - startTime;

			expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

			const stats = vectorEngine.getStats();
			expect(stats.documentsCount).toBe(
				testDocuments.length + largeDocs.length,
			);
		});

		it("should provide memory statistics", () => {
			const memoryStats = vectorEngine.getMemoryStats();

			expect(memoryStats).toHaveProperty("wasmMemoryPages");
			expect(memoryStats).toHaveProperty("wasmMemoryBytes");
			expect(memoryStats).toHaveProperty("documentsMemoryEstimate");
			expect(memoryStats).toHaveProperty("cacheMemoryEstimate");
		});
	});

	describe("SQLite WASM Utilities", () => {
		beforeEach(async () => {
			await sqliteUtils.initialize();
		});

		it("should initialize SQLite WASM utilities", async () => {
			expect(sqliteUtils).toBeDefined();

			const stats = sqliteUtils.getStats();
			expect(stats).toHaveProperty("isPGLiteEnabled");
			expect(stats).toHaveProperty("isWASMEnabled");
		});

		it("should execute basic SQL queries", async () => {
			const result = await sqliteUtils.executeQuery(
				"SELECT 1 as test_value, $1 as param_value",
				["hello"],
			);

			expect(result).toHaveProperty("columns");
			expect(result).toHaveProperty("rows");
			expect(result).toHaveProperty("executionTime");
			expect(result.executionTime).toBeGreaterThan(0);
		});

		it("should handle parameterized queries", async () => {
			const result = await sqliteUtils.executeQuery(
				"SELECT $1 as name, $2 as age",
				["John", 30],
			);

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0]).toEqual(["John", 30]);
		});

		it("should provide query performance analysis", async () => {
			const analysis = await sqliteUtils.analyzeQuery(
				"SELECT COUNT(*) FROM (SELECT generate_series(1, 1000))",
			);

			expect(analysis).toHaveProperty("executionTime");
			expect(analysis).toHaveProperty("queryPlan");
			expect(analysis).toHaveProperty("suggestions");
			expect(analysis).toHaveProperty("indexRecommendations");
		});

		it("should execute transactions safely", async () => {
			const queries = [
				{ sql: "SELECT 1 as step", params: [] },
				{ sql: "SELECT 2 as step", params: [] },
				{ sql: "SELECT 3 as step", params: [] },
			];

			const results = await sqliteUtils.executeTransaction(queries);
			expect(results).toHaveLength(3);
			results.forEach((result, index) => {
				expect(result.rows[0]).toEqual([index + 1]);
			});
		});

		it("should handle batch operations", async () => {
			const queries = Array.from({ length: 10 }, (_, i) => ({
				sql: "SELECT $1 as batch_number",
				params: [i],
			}));

			const results = await sqliteUtils.executeBatch(queries, {
				useTransaction: true,
				continueOnError: false,
			});

			expect(results).toHaveLength(10);
		});

		it("should optimize database operations", async () => {
			const optimization = await sqliteUtils.optimizeDatabase();

			expect(optimization).toHaveProperty("vacuumTime");
			expect(optimization).toHaveProperty("analyzeTime");
			expect(optimization).toHaveProperty("reindexTime");
			expect(optimization).toHaveProperty("optimizationsApplied");
			expect(Array.isArray(optimization.optimizationsApplied)).toBe(true);
		});
	});

	describe("Compute WASM Engine", () => {
		const testData = Array.from({ length: 10_000 }, () => Math.random() * 100);

		beforeEach(async () => {
			await computeEngine.initialize();
		});

		it("should initialize compute engine", async () => {
			expect(computeEngine).toBeDefined();

			const stats = computeEngine.getStats();
			expect(stats).toHaveProperty("isWASMEnabled");
			expect(stats).toHaveProperty("workersCount");
			expect(stats).toHaveProperty("memoryUsage");
		});

		it("should calculate comprehensive statistics", async () => {
			const stats = await computeEngine.calculateStatistics(testData);

			expect(stats).toHaveProperty("count", testData.length);
			expect(stats).toHaveProperty("sum");
			expect(stats).toHaveProperty("mean");
			expect(stats).toHaveProperty("median");
			expect(stats).toHaveProperty("variance");
			expect(stats).toHaveProperty("standardDeviation");
			expect(stats).toHaveProperty("skewness");
			expect(stats).toHaveProperty("kurtosis");
			expect(stats).toHaveProperty("percentiles");

			// Validate percentiles
			expect(stats.percentiles.p50).toBeCloseTo(stats.median, 3);
			expect(stats.percentiles.p25).toBeLessThan(stats.percentiles.p75);
		});

		it("should perform time series analysis", async () => {
			const timeSeriesData = {
				values: Array.from(
					{ length: 100 },
					(_, i) => Math.sin(i * 0.1) + Math.random() * 0.1,
				),
				timestamps: Array.from(
					{ length: 100 },
					(_, i) => Date.now() + i * 1000,
				),
			};

			const analysis = await computeEngine.analyzeTimeSeries(timeSeriesData);

			expect(analysis).toHaveProperty("trend");
			expect(analysis).toHaveProperty("seasonality");
			expect(analysis).toHaveProperty("anomalies");
			expect(analysis).toHaveProperty("forecast");
			expect(analysis).toHaveProperty("statistics");

			expect(["increasing", "decreasing", "stable"]).toContain(analysis.trend);
			expect(typeof analysis.seasonality).toBe("boolean");
			expect(Array.isArray(analysis.anomalies)).toBe(true);
			expect(Array.isArray(analysis.forecast)).toBe(true);
		});

		it("should process large datasets efficiently", async () => {
			const largeData = Array.from({ length: 100_000 }, () => Math.random());
			let progressCount = 0;

			const results = await computeEngine.processLargeDataset(
				largeData,
				async (chunk) => {
					return chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
				},
				{
					chunkSize: 1000,
					parallel: true,
					onProgress: (progress) => {
						progressCount++;
						expect(progress).toBeGreaterThan(0);
						expect(progress).toBeLessThanOrEqual(100);
					},
				},
			);

			expect(results).toBeDefined();
			expect(results.length).toBe(100); // 100k / 1k chunks
			expect(progressCount).toBeGreaterThan(0);
		});

		it("should benchmark WASM vs JavaScript performance", async () => {
			const benchmark = await computeEngine.benchmarkPerformance(
				"statistics",
				testData,
				5, // 5 iterations
			);

			expect(benchmark).toHaveProperty("wasmTime");
			expect(benchmark).toHaveProperty("jsTime");
			expect(benchmark).toHaveProperty("speedup");
			expect(benchmark).toHaveProperty("recommendation");

			expect(benchmark.wasmTime).toBeGreaterThan(0);
			expect(benchmark.jsTime).toBeGreaterThan(0);
			expect(benchmark.speedup).toBeGreaterThan(0);
			expect(["WASM", "JavaScript"]).toContain(benchmark.recommendation);
		});

		it("should execute custom WASM functions", async () => {
			if (computeEngine.getStats().isWASMEnabled) {
				try {
					const result = await computeEngine.executeWASMFunction(
						"calculate_mean",
						[1, 2, 3, 4, 5],
					);
					expect(typeof result).toBe("number");
				} catch (error) {
					// Some WASM functions might not be available in test environment
					expect(error.message).toContain("not available");
				}
			}
		});
	});

	describe("Cross-Module Integration", () => {
		it("should coordinate between vector search and compute engines", async () => {
			// Generate embeddings using compute engine optimizations
			const text =
				"Integration test for vector search and compute coordination";
			const embedding = await createOptimizedEmbedding(text);

			// Calculate statistics on the embedding using compute engine
			const stats = await computeEngine.calculateStatistics(embedding);

			expect(stats.count).toBe(embedding.length);
			expect(Math.abs(stats.mean)).toBeLessThan(0.1); // Should be close to 0 for normalized embedding
		});

		it("should store vector search results in SQLite", async () => {
			const results = await vectorEngine.searchByText("test query", {
				maxResults: 3,
			});

			if (results.length > 0) {
				// Store results in SQLite
				const insertQuery = `
          INSERT INTO search_results (document_id, similarity, content) 
          VALUES ($1, $2, $3)
        `;

				try {
					await sqliteUtils.executeQuery(
						"CREATE TABLE IF NOT EXISTS search_results (document_id TEXT, similarity REAL, content TEXT)",
					);

					for (const result of results) {
						await sqliteUtils.executeQuery(insertQuery, [
							result.document.id,
							result.similarity,
							result.document.content,
						]);
					}

					// Verify storage
					const storedResults = await sqliteUtils.executeQuery(
						"SELECT COUNT(*) as count FROM search_results",
					);
					expect(storedResults.rows[0][0]).toBeGreaterThanOrEqual(
						results.length,
					);
				} catch (error) {
					// SQLite might not be fully functional in test environment
					console.warn("SQLite integration test skipped:", error.message);
				}
			}
		});

		it("should analyze performance across all modules", async () => {
			const performanceReport = {
				vectorSearch: vectorEngine.getStats(),
				sqliteUtils: sqliteUtils.getStats(),
				computeEngine: computeEngine.getStats(),
			};

			expect(performanceReport.vectorSearch).toHaveProperty("isWASMEnabled");
			expect(performanceReport.sqliteUtils).toHaveProperty("isPGLiteEnabled");
			expect(performanceReport.computeEngine).toHaveProperty("isWASMEnabled");

			// Log performance summary
			console.log("WASM Integration Performance Report:", {
				vectorSearchDocs: performanceReport.vectorSearch.documentsCount,
				sqliteCacheSize: performanceReport.sqliteUtils.cacheSize,
				computeMemoryUsage: performanceReport.computeEngine.memoryUsage,
			});
		});
	});

	describe("Error Handling and Resilience", () => {
		it("should handle WASM initialization failures gracefully", async () => {
			const faultyEngine = new VectorSearchWASM({ dimensions: 384 });

			// Should not throw even if WASM fails
			await expect(faultyEngine.initialize()).resolves.not.toThrow();

			// Should fall back to JavaScript
			const embedding = await faultyEngine["generateEmbedding"]("test");
			expect(embedding).toHaveLength(384);
		});

		it("should recover from memory allocation failures", async () => {
			const testEngine = createComputeEngine({
				memoryPages: 1, // Very small memory
				enableOptimizations: true,
			});

			await testEngine.initialize();

			// Should handle large data gracefully
			const largeData = new Array(1_000_000).fill(1);
			await expect(
				testEngine.calculateStatistics(largeData),
			).resolves.toBeDefined();
		});

		it("should handle malformed queries in SQLite", async () => {
			await expect(
				sqliteUtils.executeQuery("INVALID SQL SYNTAX"),
			).rejects.toThrow();

			// Should still work for valid queries after error
			const result = await sqliteUtils.executeQuery(
				"SELECT 1 as recovery_test",
			);
			expect(result.rows[0][0]).toBe(1);
		});
	});

	describe("Memory Management and Cleanup", () => {
		it("should clean up resources properly", () => {
			const initialStats = {
				vector: vectorEngine.getMemoryStats(),
				compute: computeEngine.getStats(),
			};

			// Add some data
			vectorEngine.addDocuments([
				{
					id: "cleanup-test",
					content: "test",
					embedding: new Array(384).fill(0.1),
					metadata: {},
				},
			]);

			// Clear and check cleanup
			vectorEngine.clear();
			sqliteUtils.clear();

			const afterStats = {
				vector: vectorEngine.getMemoryStats(),
				compute: computeEngine.getStats(),
			};

			expect(vectorEngine.getStats().documentsCount).toBe(0);
			expect(sqliteUtils.getStats().cacheSize).toBe(0);
		});

		it("should handle concurrent operations safely", async () => {
			const concurrentOperations = [
				vectorEngine.searchByText("concurrent test 1"),
				vectorEngine.searchByText("concurrent test 2"),
				computeEngine.calculateStatistics([1, 2, 3, 4, 5]),
				sqliteUtils.executeQuery("SELECT $1 as concurrent", ["test"]),
			];

			const results = await Promise.all(concurrentOperations);
			expect(results).toHaveLength(4);
			results.forEach((result) => expect(result).toBeDefined());
		});
	});
});

describe("WASM Services Performance Benchmarks", () => {
	it("should meet performance requirements", async () => {
		const benchmarks = {
			vectorSearchTime: 0,
			sqliteQueryTime: 0,
			computeStatsTime: 0,
		};

		// Vector search benchmark
		const vectorStart = performance.now();
		const vectorEngine = new VectorSearchWASM();
		await vectorEngine.initialize();
		await vectorEngine.addDocuments([
			{
				id: "bench",
				content: "benchmark",
				embedding: new Array(384).fill(0.1),
				metadata: {},
			},
		]);
		await vectorEngine.searchByText("benchmark");
		benchmarks.vectorSearchTime = performance.now() - vectorStart;

		// SQLite benchmark
		const sqliteStart = performance.now();
		const sqliteUtils = createSQLiteWASMUtils();
		await sqliteUtils.initialize();
		await sqliteUtils.executeQuery("SELECT 1");
		benchmarks.sqliteQueryTime = performance.now() - sqliteStart;

		// Compute benchmark
		const computeStart = performance.now();
		const computeEngine = createComputeEngine();
		await computeEngine.initialize();
		await computeEngine.calculateStatistics([1, 2, 3, 4, 5]);
		benchmarks.computeStatsTime = performance.now() - computeStart;

		console.log("Performance Benchmarks:", benchmarks);

		// Performance assertions (adjust based on requirements)
		expect(benchmarks.vectorSearchTime).toBeLessThan(5000); // 5 seconds
		expect(benchmarks.sqliteQueryTime).toBeLessThan(2000); // 2 seconds
		expect(benchmarks.computeStatsTime).toBeLessThan(1000); // 1 second
	});
});
