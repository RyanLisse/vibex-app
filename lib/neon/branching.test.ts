/**
 * Neon Branching Integration Tests
 *
 * Tests for database branching functionality using Neon's branching API
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createNeonBranchingManager,
	createNeonTestUtils,
	type NeonBranch,
} from "./branching";

// Test configuration
const TEST_CONFIG = {
	projectId: process.env.NEON_PROJECT_ID || "test-project-id",
	apiKey: process.env.NEON_API_KEY || "test-api-key",
};

// Skip tests if no real Neon credentials are provided
const shouldSkipIntegrationTests = !(
	process.env.NEON_PROJECT_ID && process.env.NEON_API_KEY
);

describe("Neon Branching Integration", () => {
	let branchingManager: ReturnType<typeof createNeonBranchingManager>;
	let testUtils: ReturnType<typeof createNeonTestUtils>;
	let testBranches: NeonBranch[] = [];

	beforeAll(async () => {
		if (shouldSkipIntegrationTests) {
			console.log(
				"⚠️ Skipping Neon integration tests - no credentials provided",
			);
			return;
		}

		branchingManager = createNeonBranchingManager(TEST_CONFIG);
		testUtils = createNeonTestUtils(branchingManager);
	});

	afterAll(async () => {
		if (shouldSkipIntegrationTests) return;

		// Cleanup test branches
		for (const branch of testBranches) {
			try {
				await branchingManager.deleteBranch(branch.id);
				console.log(`🗑️ Cleaned up test branch: ${branch.name}`);
			} catch (error) {
				console.warn(`Failed to cleanup branch ${branch.name}:`, error);
			}
		}
	});

	beforeEach(() => {
		testBranches = [];
	});

	describe("Branch Management", () => {
		it("should create a new branch", async () => {
			if (shouldSkipIntegrationTests) return;

			const branchName = `test-branch-${Date.now()}`;

			const branch = await branchingManager.createBranch({
				name: branchName,
			});

			testBranches.push(branch);

			expect(branch).toBeDefined();
			expect(branch.name).toBe(branchName);
			expect(branch.id).toBeDefined();
			expect(branch.createdAt).toBeDefined();
		});

		it("should list all branches", async () => {
			if (shouldSkipIntegrationTests) return;

			const branches = await branchingManager.listBranches();

			expect(Array.isArray(branches)).toBe(true);
			expect(branches.length).toBeGreaterThan(0);

			// Should have at least the main branch
			const mainBranch = branches.find((b) => b.primary);
			expect(mainBranch).toBeDefined();
		});

		it("should get branch details", async () => {
			if (shouldSkipIntegrationTests) return;

			// Create a test branch first
			const branchName = `test-details-${Date.now()}`;
			const createdBranch = await branchingManager.createBranch({
				name: branchName,
			});
			testBranches.push(createdBranch);

			// Get branch details
			const branch = await branchingManager.getBranch(createdBranch.id);

			expect(branch).toBeDefined();
			expect(branch.id).toBe(createdBranch.id);
			expect(branch.name).toBe(branchName);
		});

		it("should get branch endpoints", async () => {
			if (shouldSkipIntegrationTests) return;

			// Create a test branch first
			const branchName = `test-endpoints-${Date.now()}`;
			const createdBranch = await branchingManager.createBranch({
				name: branchName,
			});
			testBranches.push(createdBranch);

			// Wait for branch to be ready
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// Get branch endpoints
			const endpoints = await branchingManager.getBranchEndpoints(
				createdBranch.id,
			);

			expect(Array.isArray(endpoints)).toBe(true);
			expect(endpoints.length).toBeGreaterThan(0);

			const readWriteEndpoint = endpoints.find(
				(ep) => ep.type === "read_write",
			);
			expect(readWriteEndpoint).toBeDefined();
			expect(readWriteEndpoint?.host).toBeDefined();
		});

		it("should get connection string for branch", async () => {
			if (shouldSkipIntegrationTests) return;

			// Create a test branch first
			const branchName = `test-connection-${Date.now()}`;
			const createdBranch = await branchingManager.createBranch({
				name: branchName,
			});
			testBranches.push(createdBranch);

			// Wait for branch to be ready
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// Get connection string
			const connectionString = await branchingManager.getBranchConnectionString(
				createdBranch.id,
			);

			expect(connectionString).toBeDefined();
			expect(connectionString).toContain("postgres://");
			expect(connectionString).toContain("sslmode=require");
		});

		it("should delete a branch", async () => {
			if (shouldSkipIntegrationTests) return;

			// Create a test branch first
			const branchName = `test-delete-${Date.now()}`;
			const createdBranch = await branchingManager.createBranch({
				name: branchName,
			});

			// Delete the branch
			await branchingManager.deleteBranch(createdBranch.id);

			// Verify branch is deleted by trying to get it (should fail)
			try {
				await branchingManager.getBranch(createdBranch.id);
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe("Test Utilities", () => {
		it("should create and cleanup test branch", async () => {
			if (shouldSkipIntegrationTests) return;

			const testName = "sample-test";
			let branchCreated = false;
			let testExecuted = false;

			await testUtils.runTestsInBranch(
				testName,
				async (connectionString) => {
					branchCreated = true;
					testExecuted = true;

					expect(connectionString).toBeDefined();
					expect(connectionString).toContain("postgres://");

					return "test-result";
				},
				{
					cleanupOnSuccess: true,
					cleanupOnError: true,
				},
			);

			expect(branchCreated).toBe(true);
			expect(testExecuted).toBe(true);
		});

		it("should run query tests in isolated branch", async () => {
			if (shouldSkipIntegrationTests) return;

			const testQueries = [
				{
					name: "create-test-table",
					sql: "CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT)",
				},
				{
					name: "insert-test-data",
					sql: "INSERT INTO test_table (name) VALUES ('test1'), ('test2')",
				},
				{
					name: "select-test-data",
					sql: "SELECT COUNT(*) as count FROM test_table",
					expectedResult: [{ count: 2 }],
				},
			];

			await testUtils.testQueriesInBranch("query-test-suite", testQueries);
		});

		it("should handle test failures gracefully", async () => {
			if (shouldSkipIntegrationTests) return;

			const testQueries = [
				{
					name: "failing-query",
					sql: "SELECT * FROM non_existent_table",
					shouldFail: true,
				},
			];

			// This should not throw an error because we expect the query to fail
			await testUtils.testQueriesInBranch("failing-query-test", testQueries);
		});
	});

	describe("Feature Branch Workflows", () => {
		it("should create feature branch", async () => {
			if (shouldSkipIntegrationTests) return;

			const featureName = "test-feature";
			const { branch, connectionString } =
				await branchingManager.createFeatureBranch(featureName);

			testBranches.push(branch);

			expect(branch.name).toBe(`feature-${featureName}`);
			expect(connectionString).toBeDefined();
			expect(connectionString).toContain("postgres://");
		});

		it("should create test branch with parent", async () => {
			if (shouldSkipIntegrationTests) return;

			// First create a feature branch
			const featureName = "parent-feature";
			const { branch: parentBranch } =
				await branchingManager.createFeatureBranch(featureName);
			testBranches.push(parentBranch);

			// Then create a test branch from the feature branch
			const testName = "child-test";
			const { branch: testBranch } = await branchingManager.createTestBranch(
				testName,
				parentBranch.id,
			);
			testBranches.push(testBranch);

			expect(testBranch.parentId).toBe(parentBranch.id);
			expect(testBranch.name).toContain(testName);
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid branch creation", async () => {
			if (shouldSkipIntegrationTests) return;

			try {
				await branchingManager.createBranch({
					name: "", // Invalid empty name
				});
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});

		it("should handle non-existent branch operations", async () => {
			if (shouldSkipIntegrationTests) return;

			const nonExistentBranchId = "br-non-existent-123";

			try {
				await branchingManager.getBranch(nonExistentBranchId);
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});

		it("should handle connection string for non-ready branch", async () => {
			if (shouldSkipIntegrationTests) return;

			// Create a branch but don't wait for it to be ready
			const branchName = `test-not-ready-${Date.now()}`;
			const createdBranch = await branchingManager.createBranch({
				name: branchName,
			});
			testBranches.push(createdBranch);

			try {
				// Try to get connection string immediately (might fail if branch not ready)
				await branchingManager.getBranchConnectionString(createdBranch.id);
				// If it succeeds, that's fine too (branch might be ready quickly)
			} catch (error) {
				// Expected if branch is not ready yet
				expect(error).toBeDefined();
			}
		});
	});
});

// Mock tests for when no credentials are provided
describe("Neon Branching (Mock Tests)", () => {
	it("should create branching manager with config", () => {
		const manager = createNeonBranchingManager({
			apiKey: "test-key",
			projectId: "test-project",
		});

		expect(manager).toBeDefined();
	});

	it("should create test utils with manager", () => {
		const manager = createNeonBranchingManager({
			apiKey: "test-key",
			projectId: "test-project",
		});

		const utils = createNeonTestUtils(manager);
		expect(utils).toBeDefined();
	});
});
