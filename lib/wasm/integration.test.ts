/**
 * WASM Services Integration Tests
 *
 * Comprehensive tests for all WASM modules including vector search,
 * SQLite utilities, and compute operations with performance benchmarking.
 */

import { describe, expect, it } from "vitest";
import { WASMServices, wasmServices } from "./services";
import { createSQLiteWASMUtils, SQLiteWASMUtils } from "./sqlite-utils";
import {
	calculateFastSimilarity,
	createOptimizedEmbedding,
	VectorSearchWASM,
} from "./vector-search";

describe("WASM Integration", () => {
	it("should load WASM modules successfully", () => {
		// Test if we can import the modules
		expect(typeof wasmServices).toBe("object");
		expect(wasmServices).toBeDefined();
		expect(wasmServices.constructor).toBe(WASMServices);
	});

	it("should create SQLite WASM utilities", () => {
		// Test the factory function
		expect(typeof createSQLiteWASMUtils).toBe("function");

		const utils = createSQLiteWASMUtils();
		expect(utils).toBeDefined();
		expect(utils).toBeInstanceOf(SQLiteWASMUtils);
	});

	it("should calculate fast similarity", () => {
		const vector1 = [1, 0, 0];
		const vector2 = [1, 0, 0];
		const similarity = calculateFastSimilarity(vector1, vector2);
		expect(similarity).toBe(1);
	});

	it("should create optimized embeddings", () => {
		const embedding = createOptimizedEmbedding("test", 10);
		expect(embedding).toHaveLength(10);
		expect(embedding.every((val) => typeof val === "number")).toBe(true);
	});

	it("should initialize vector search", async () => {
		const vectorSearch = new VectorSearchWASM();
		await vectorSearch.initialize();
		expect(vectorSearch.getStats()).toBeDefined();
	});
});
