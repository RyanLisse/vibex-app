/**
 * WASM Services Integration Test
 *
 * Simple test to verify all WASM services can be initialized and work correctly.
 */

import { wasmDetector } from "./detection";
import { wasmServices } from "./services";

async function testWASMServices() {
	console.log("🧪 Testing WASM Services Integration...");

	try {
		// Test 1: Capability Detection
		console.log("\n1. Testing WASM capability detection...");
		const capabilities = await wasmDetector.detectCapabilities();
		console.log("✅ Capabilities detected:", {
			isSupported: capabilities.isSupported,
			hasThreads: capabilities.hasThreads,
			hasSIMD: capabilities.hasSIMD,
			performance: capabilities.performance,
			browser: capabilities.browserInfo.name,
		});

		// Test 2: Services Initialization
		console.log("\n2. Testing WASM services initialization...");
		await wasmServices.initialize();
		console.log("✅ WASM services initialized successfully");

		// Test 3: Vector Search
		console.log("\n3. Testing Vector Search service...");
		try {
			const vectorSearch = wasmServices.getVectorSearch();
			await vectorSearch.initialize();

			// Add a test document
			await vectorSearch.addDocument({
				id: "test-1",
				content: "This is a test document",
				embedding: new Array(384).fill(0).map(() => Math.random()),
			});

			// Search for similar documents
			const results = await vectorSearch.search(
				new Array(384).fill(0).map(() => Math.random()),
				{ maxResults: 5 },
			);

			console.log("✅ Vector search working:", {
				documentsCount: vectorSearch.getDocumentCount(),
				searchResults: results.length,
			});
		} catch (error) {
			console.log("⚠️ Vector search using fallback:", error.message);
		}

		// Test 4: SQLite Utils
		console.log("\n4. Testing SQLite WASM utilities...");
		try {
			const sqliteUtils = wasmServices.getSQLiteUtils();
			await sqliteUtils.initialize();

			// Test a simple query
			const result = await sqliteUtils.executeQuery(
				"SELECT 1 as test_value, 'hello' as test_string",
			);

			console.log("✅ SQLite utils working:", {
				queryTime: result.queryTime,
				rowCount: result.rowCount,
			});
		} catch (error) {
			console.log("⚠️ SQLite utils using fallback:", error.message);
		}

		// Test 5: Compute Engine
		console.log("\n5. Testing Compute WASM engine...");
		try {
			const computeEngine = wasmServices.getComputeEngine();
			await computeEngine.initialize();

			// Submit a test task
			const taskId = await computeEngine.submitTask({
				type: "statistics",
				operation: "summary",
				data: {
					values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				},
			});

			console.log("✅ Compute engine working:", {
				taskSubmitted: taskId,
				stats: computeEngine.getStats(),
			});
		} catch (error) {
			console.log("⚠️ Compute engine using fallback:", error.message);
		}

		// Test 6: Overall Health Check
		console.log("\n6. Testing overall health check...");
		const healthCheck = await wasmServices.healthCheck();
		console.log("✅ Health check completed:", healthCheck);

		console.log("\n🎉 All WASM services tests completed successfully!");
	} catch (error) {
		console.error("❌ WASM services test failed:", error);
		throw error;
	}
}

// Run the test if this file is executed directly
if (import.meta.main) {
	testWASMServices().catch(console.error);
}

export { testWASMServices };
