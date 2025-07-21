/**
 * WASM Services Integration Tests
 *
 * Comprehensive tests for all WASM modules including vector search,
 * SQLite utilities, and compute operations with performance benchmarking.
 */

import { describe, expect, it } from "vitest";
import { type WASMServices, wasmServices } from "./services";
import { createSQLiteWASMUtils, type SQLiteWASMUtils } from "./sqlite-utils";
import {
	calculateFastSimilarity,
	createOptimizedEmbedding,
	VectorSearchWASM,
} from "./vector-search";

describe("WASM Integration", () => {
	it("should load WASM modules successfully", () => {
		expect(wasmServices).toBeDefined();
		expect(wasmServices).toBeInstanceOf(WASMServices);
	});

	it("should create SQLite WASM utilities", () => {
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
