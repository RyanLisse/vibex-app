/**
 * WASM Services Usage Example
 *
 * Demonstrates how to use WASM services with observability integration
 * for high-performance database operations.
 */

import { observability } from "../../observability";
	AgentMemory,
	CreateMemoryRequest,
} from "../../observability/types";
import { wasmServices } from "../services";
import type { VectorDocument } from "../vector-search";

/**
 * Example: High-performance vector search for agent memories
 */
async function vectorSearchExample() {
	console.log("=== Vector Search Example ===");

	// Get the vector search service
	const vectorSearch = wasmServices.getVectorSearch();

	// Example agent memories to index
	const memories: VectorDocument[] = [
		{
			id: "mem_001",
			content: "User prefers dark mode and minimalist UI design",
			embedding: new Array(384).fill(0).map(() => Math.random()),
			metadata: {
				agentType: "ui-assistant",
				memoryType: "user_preference",
				importance: 8,
			},
		},
		{
			id: "mem_002",
			content: "User frequently uses keyboard shortcuts for navigation",
			embedding: new Array(384).fill(0).map(() => Math.random()),
			metadata: {
				agentType: "ui-assistant",
				memoryType: "user_preference",
				importance: 7,
			},
		},
		// Add more memories...
	];

	// Index memories with performance tracking
	await observability.trackOperation(
		"example.vector_search.index",
		async () => {
			await vectorSearch.addDocuments(memories);
			console.log(`Indexed ${memories.length} agent memories`);
		},
	);

	// Search for relevant memories
	const queryEmbedding = new Array(384).fill(0).map(() => Math.random());

	const searchResults = await observability.trackOperation(
		"example.vector_search.query",
		async () => {
			return await vectorSearch.search(queryEmbedding, {
				maxResults: 5,
				threshold: 0.7,
				filters: {
					agentType: "ui-assistant",
				},
			});
		},
	);

	console.log(`Found ${searchResults.length} relevant memories`);
	searchResults.forEach((result) => {
		console.log(
			`- ${result.document.id}: ${result.document.content} (similarity: ${result.similarity.toFixed(3)})`,
		);
	});
}

/**
 * Example: Optimized SQLite operations for observability data
 */
async function sqliteOptimizationExample() {
	console.log("\n=== SQLite Optimization Example ===");

	// Get the SQLite utilities
	const sqliteUtils = wasmServices.getSQLiteUtils();

	// Example: Analyze query performance
	const analysisResult = await observability.trackOperation(
		"example.sqlite.analyze",
		async () => {
			return await sqliteUtils.analyzeQuery(
				`SELECT 
        ae.id, ae.agentType, ae.status, 
        COUNT(oe.id) as eventCount,
        AVG(ae.executionTimeMs) as avgExecutionTime
      FROM agent_executions ae
      LEFT JOIN observability_events oe ON oe.executionId = ae.id
      WHERE ae.createdAt > datetime('now', '-7 days')
      GROUP BY ae.id, ae.agentType, ae.status
      HAVING eventCount > 10
      ORDER BY avgExecutionTime DESC`,
				[],
			);
		},
	);

	console.log("Query Analysis:");
	console.log(`- Execution Time: ${analysisResult.executionTime.toFixed(2)}ms`);
	console.log(`- Suggestions: ${analysisResult.suggestions.join(", ")}`);
	console.log(
		`- Index Recommendations: ${analysisResult.indexRecommendations.join(", ")}`,
	);

	// Example: Batch execute optimized queries
	const batchQueries = [
		{
			sql: "CREATE INDEX IF NOT EXISTS idx_agent_executions_created ON agent_executions(createdAt)",
		},
		{
			sql: "CREATE INDEX IF NOT EXISTS idx_observability_events_execution ON observability_events(executionId)",
		},
		{
			sql: "VACUUM",
		},
	];

	const batchResults = await sqliteUtils.executeBatch(batchQueries, {
		useTransaction: true,
		continueOnError: false,
	});

	console.log(`Executed ${batchResults.length} optimization queries`);
}

/**
 * Example: Heavy data processing with WASM
 */
async function dataProcessingExample() {
	console.log("\n=== Data Processing Example ===");

	// Get the data processor
	const processor = wasmServices.getDataProcessor();

	// Generate sample observability data
	const sampleData = Array.from({ length: 10_000 }, (_, i) => ({
		id: `event_${i}`,
		timestamp: new Date(
			Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
		).toISOString(),
		eventType: ["execution_started", "execution_completed", "error"][
			Math.floor(Math.random() * 3)
		],
		executionTime: Math.random() * 1000,
		memoryUsage: Math.random() * 100 * 1024 * 1024,
		agentType: ["code-assistant", "ui-assistant", "data-analyst"][
			Math.floor(Math.random() * 3)
		],
	}));

	// Transform data with WASM optimization
	const transformResult = await processor.transform(sampleData, {
		transformations: [
			{ field: "eventType", operation: "uppercase" },
			{ field: "timestamp", operation: "normalize" },
		],
		fields: ["id", "timestamp", "eventType", "executionTime", "agentType"],
	});

	console.log(
		`Transformed ${transformResult.processedItems} items in ${transformResult.executionTime.toFixed(2)}ms`,
	);
	console.log(`WASM Optimized: ${transformResult.wasmOptimized}`);

	// Aggregate data with WASM optimization
	const aggregateResult = await processor.aggregate(sampleData, {
		groupBy: ["agentType", "eventType"],
		operations: [
			{ field: "executionTime", operation: "avg", alias: "avgTime" },
			{ field: "executionTime", operation: "max", alias: "maxTime" },
			{ field: "memoryUsage", operation: "avg", alias: "avgMemory" },
			{ field: "id", operation: "count", alias: "eventCount" },
		],
	});

	console.log(
		`\nAggregation Results (${aggregateResult.executionTime.toFixed(2)}ms):`,
	);
	aggregateResult.result.slice(0, 5).forEach((group) => {
		console.log(
			`- ${group.agentType} / ${group.eventType}: ${group.eventCount} events, avg time: ${group.avgTime.toFixed(2)}ms`,
		);
	});
}

/**
 * Example: Streaming data processing
 */
async function streamingExample() {
	console.log("\n=== Streaming Data Processing Example ===");

	const processor = wasmServices.getDataProcessor();

	// Simulate a data stream
	async function* dataStream() {
		for (let i = 0; i < 1000; i++) {
			yield {
				id: `stream_${i}`,
				value: Math.random() * 1000,
				timestamp: Date.now(),
			};
			// Simulate async data arrival
			if (i % 100 === 0) {
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		}
	}

	let totalProcessed = 0;

	// Process stream with WASM optimization
	const streamProcessor = processor.processStream(
		dataStream(),
		async (chunk) => {
			// Apply transformations to chunk
			return chunk.map((item) => ({
				...item,
				normalized: item.value / 1000,
				category: item.value > 500 ? "high" : "low",
			}));
		},
		{
			chunkSize: 50,
			onProgress: (processed) => {
				totalProcessed = processed;
				if (processed % 200 === 0) {
					console.log(`Processed ${processed} items...`);
				}
			},
		},
	);

	// Consume the processed stream
	for await (const result of streamProcessor) {
		// Process results...
	}

	console.log(`Stream processing complete: ${totalProcessed} items processed`);
}

/**
 * Example: Performance monitoring and health checks
 */
async function performanceMonitoringExample() {
	console.log("\n=== Performance Monitoring Example ===");

	// Get performance tracker and observability integration
	const perfTracker = wasmServices.getPerformanceTracker();
	const wasmObservability = wasmServices.getObservability();

	// Generate performance report
	const perfReport = perfTracker.generateReport();

	console.log("Performance Summary:");
	console.log(`- WASM Enabled: ${perfReport.summary.wasmEnabled}`);
	console.log(`- WASM Calls: ${perfReport.summary.wasmCallCount}`);
	console.log(`- Fallback Calls: ${perfReport.summary.fallbackCount}`);
	console.log(
		`- Average WASM Time: ${perfReport.summary.averageWASMTime.toFixed(2)}ms`,
	);
	console.log(
		`- Average Fallback Time: ${perfReport.summary.averageFallbackTime.toFixed(2)}ms`,
	);

	// Get health status
	const healthStatus = await wasmObservability.getHealthStatus();

	console.log("\nHealth Status:");
	console.log(`- Overall: ${healthStatus.overall}`);
	console.log(`- Memory Pressure: ${healthStatus.memory.memoryPressure}`);
	console.log(
		`- WASM Memory Usage: ${(healthStatus.memory.wasmMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
	);

	console.log("\nService Health:");
	Object.entries(healthStatus.services).forEach(([service, health]) => {
		console.log(
			`- ${service}: ${health.status} (error rate: ${health.errorRate.toFixed(1)}%, avg response: ${health.averageResponseTime.toFixed(2)}ms)`,
		);
	});

	if (healthStatus.recommendations.length > 0) {
		console.log("\nRecommendations:");
		healthStatus.recommendations.forEach((rec) => console.log(`- ${rec}`));
	}
}

/**
 * Main example runner
 */
export async function runWASMExamples() {
	try {
		// Initialize WASM services
		console.log("Initializing WASM Services...");
		await wasmServices.initialize();

		// Run examples
		await vectorSearchExample();
		await sqliteOptimizationExample();
		await dataProcessingExample();
		await streamingExample();
		await performanceMonitoringExample();

		// Get final stats
		console.log("\n=== Final Statistics ===");
		const stats = wasmServices.getStats();
		console.log("Capabilities:", stats.capabilities);
		console.log(
			`Initialization Time: ${stats.initializationTime.toFixed(2)}ms`,
		);

		// Cleanup
		console.log("\nCleaning up...");
		wasmServices.cleanup();
	} catch (error) {
		console.error("Example failed:", error);
	}
}

// Run examples if this file is executed directly
if (
	typeof window !== "undefined" ||
	process.argv[1]?.endsWith("usage-example.ts")
) {
	runWASMExamples().catch(console.error);
}
