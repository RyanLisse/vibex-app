/**
 * Neon Database Branching Integration
 *
 * This module provides utilities for managing Neon database branches
 * for testing, development, and feature isolation workflows.
 */

import { neon } from "@neondatabase/serverless";

export interface NeonBranchConfig {
	projectId: string;
	apiKey: string;
	parentBranch?: string;
	branchName?: string;
	computeProvisioner?: "k8s-pod" | "k8s-neonvm";
}

export interface NeonBranch {
	id: string;
	name: string;
	parentId?: string;
	parentLsn?: string;
	parentTimestamp?: string;
	createdAt: string;
	updatedAt: string;
	primary: boolean;
	protected: boolean;
	currentState: "init" | "ready";
	logicalSize?: number;
	physicalSize?: number;
	computeTimeSeconds?: number;
	activeTimeSeconds?: number;
	writtenDataBytes?: number;
	dataTransferBytes?: number;
}

export interface NeonEndpoint {
	id: string;
	branchId: string;
	host: string;
	type: "read_write" | "read_only";
	currentState: "init" | "active" | "idle";
	settings: {
		pgSettings?: Record<string, string>;
		poolerEnabled?: boolean;
		poolerMode?: "transaction" | "session";
	};
}

/**
 * Neon Branching Manager
 */
export class NeonBranchingManager {
	private apiKey: string;
	private projectId: string;
	private baseUrl = "https://console.neon.tech/api/v2";

	constructor(config: { apiKey: string; projectId: string }) {
		this.apiKey = config.apiKey;
		this.projectId = config.projectId;
	}

	/**
	 * Create a new database branch
	 */
	async createBranch(config: {
		name: string;
		parentBranch?: string;
		parentLsn?: string;
		parentTimestamp?: string;
	}): Promise<NeonBranch> {
		const response = await fetch(
			`${this.baseUrl}/projects/${this.projectId}/branches`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					branch: {
						name: config.name,
						parent_id: config.parentBranch,
						parent_lsn: config.parentLsn,
						parent_timestamp: config.parentTimestamp,
					},
					endpoints: [
						{
							type: "read_write",
							settings: {
								pg_settings: {},
							},
						},
					],
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to create branch: ${error}`);
		}

		const result = await response.json();
		return this.mapBranchResponse(result.branch);
	}

	/**
	 * List all branches in the project
	 */
	async listBranches(): Promise<NeonBranch[]> {
		const response = await fetch(
			`${this.baseUrl}/projects/${this.projectId}/branches`,
			{
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to list branches: ${error}`);
		}

		const result = await response.json();
		return result.branches.map((branch: any) => this.mapBranchResponse(branch));
	}

	/**
	 * Get branch details
	 */
	async getBranch(branchId: string): Promise<NeonBranch> {
		const response = await fetch(
			`${this.baseUrl}/projects/${this.projectId}/branches/${branchId}`,
			{
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get branch: ${error}`);
		}

		const result = await response.json();
		return this.mapBranchResponse(result.branch);
	}

	/**
	 * Delete a branch
	 */
	async deleteBranch(branchId: string): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/projects/${this.projectId}/branches/${branchId}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to delete branch: ${error}`);
		}
	}

	/**
	 * Get branch endpoints
	 */
	async getBranchEndpoints(branchId: string): Promise<NeonEndpoint[]> {
		const response = await fetch(
			`${this.baseUrl}/projects/${this.projectId}/branches/${branchId}/endpoints`,
			{
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get branch endpoints: ${error}`);
		}

		const result = await response.json();
		return result.endpoints.map((endpoint: any) =>
			this.mapEndpointResponse(endpoint),
		);
	}

	/**
	 * Get connection string for a branch
	 */
	async getBranchConnectionString(
		branchId: string,
		databaseName = "neondb",
	): Promise<string> {
		const endpoints = await this.getBranchEndpoints(branchId);
		const readWriteEndpoint = endpoints.find((ep) => ep.type === "read_write");

		if (!readWriteEndpoint) {
			throw new Error("No read-write endpoint found for branch");
		}

		// Note: In a real implementation, you'd need to get the actual password
		// This is a placeholder - the actual password would come from your secure storage
		const password = process.env.NEON_DATABASE_PASSWORD || "your-password";

		return `postgres://neondb_owner:${password}@${readWriteEndpoint.host}/${databaseName}?sslmode=require`;
	}

	/**
	 * Create a test branch for running tests
	 */
	async createTestBranch(
		testName: string,
		parentBranch?: string,
	): Promise<{
		branch: NeonBranch;
		connectionString: string;
	}> {
		const branchName = `test-${testName}-${Date.now()}`;

		const branch = await this.createBranch({
			name: branchName,
			parentBranch,
		});

		// Wait for branch to be ready
		await this.waitForBranchReady(branch.id);

		const connectionString = await this.getBranchConnectionString(branch.id);

		return { branch, connectionString };
	}

	/**
	 * Create a feature branch for development
	 */
	async createFeatureBranch(
		featureName: string,
		parentBranch?: string,
	): Promise<{
		branch: NeonBranch;
		connectionString: string;
	}> {
		const branchName = `feature-${featureName}`;

		const branch = await this.createBranch({
			name: branchName,
			parentBranch,
		});

		await this.waitForBranchReady(branch.id);
		const connectionString = await this.getBranchConnectionString(branch.id);

		return { branch, connectionString };
	}

	/**
	 * Wait for branch to be ready
	 */
	private async waitForBranchReady(
		branchId: string,
		maxWaitMs = 60_000,
	): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < maxWaitMs) {
			const branch = await this.getBranch(branchId);

			if (branch.currentState === "ready") {
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		throw new Error(
			`Branch ${branchId} did not become ready within ${maxWaitMs}ms`,
		);
	}

	/**
	 * Map API response to NeonBranch interface
	 */
	private mapBranchResponse(branch: any): NeonBranch {
		return {
			id: branch.id,
			name: branch.name,
			parentId: branch.parent_id,
			parentLsn: branch.parent_lsn,
			parentTimestamp: branch.parent_timestamp,
			createdAt: branch.created_at,
			updatedAt: branch.updated_at,
			primary: branch.primary,
			protected: branch.protected,
			currentState: branch.current_state,
			logicalSize: branch.logical_size,
			physicalSize: branch.physical_size,
			computeTimeSeconds: branch.compute_time_seconds,
			activeTimeSeconds: branch.active_time_seconds,
			writtenDataBytes: branch.written_data_bytes,
			dataTransferBytes: branch.data_transfer_bytes,
		};
	}

	/**
	 * Map API response to NeonEndpoint interface
	 */
	private mapEndpointResponse(endpoint: any): NeonEndpoint {
		return {
			id: endpoint.id,
			branchId: endpoint.branch_id,
			host: endpoint.host,
			type: endpoint.type,
			currentState: endpoint.current_state,
			settings: {
				pgSettings: endpoint.settings?.pg_settings,
				poolerEnabled: endpoint.pooler_enabled,
				poolerMode: endpoint.pooler_mode,
			},
		};
	}
}

/**
 * Test utilities for Neon branching
 */
export class NeonTestUtils {
	private branchingManager: NeonBranchingManager;

	constructor(branchingManager: NeonBranchingManager) {
		this.branchingManager = branchingManager;
	}

	/**
	 * Run tests in isolated branch
	 */
	async runTestsInBranch<T>(
		testName: string,
		testFn: (connectionString: string) => Promise<T>,
		options: {
			parentBranch?: string;
			cleanupOnSuccess?: boolean;
			cleanupOnError?: boolean;
		} = {},
	): Promise<T> {
		const { cleanupOnSuccess = true, cleanupOnError = true } = options;

		let testBranch: NeonBranch | null = null;

		try {
			console.log(`🌿 Creating test branch for: ${testName}`);
			const { branch, connectionString } =
				await this.branchingManager.createTestBranch(
					testName,
					options.parentBranch,
				);

			testBranch = branch;
			console.log(`✅ Test branch created: ${branch.name} (${branch.id})`);

			// Run the test
			const result = await testFn(connectionString);

			console.log(`✅ Test completed successfully: ${testName}`);

			// Cleanup on success
			if (cleanupOnSuccess && testBranch) {
				await this.branchingManager.deleteBranch(testBranch.id);
				console.log(`🗑️ Test branch cleaned up: ${testBranch.name}`);
			}

			return result;
		} catch (error) {
			console.error(`❌ Test failed: ${testName}`, error);

			// Cleanup on error
			if (cleanupOnError && testBranch) {
				try {
					await this.branchingManager.deleteBranch(testBranch.id);
					console.log(
						`🗑️ Test branch cleaned up after error: ${testBranch.name}`,
					);
				} catch (cleanupError) {
					console.error(`Failed to cleanup test branch: ${cleanupError}`);
				}
			}

			throw error;
		}
	}

	/**
	 * Run query tests against a branch
	 */
	async testQueriesInBranch(
		testName: string,
		queries: Array<{
			name: string;
			sql: string;
			expectedResult?: any;
			shouldFail?: boolean;
		}>,
		options: {
			parentBranch?: string;
			setupSql?: string[];
		} = {},
	): Promise<void> {
		await this.runTestsInBranch(
			testName,
			async (connectionString) => {
				const sql = neon(connectionString);

				// Run setup queries if provided
				if (options.setupSql) {
					console.log("🔧 Running setup queries...");
					for (const setupQuery of options.setupSql) {
						await sql.unsafe(setupQuery);
					}
				}

				// Run test queries
				for (const query of queries) {
					console.log(`🔍 Testing query: ${query.name}`);

					try {
						const result = await sql.unsafe(query.sql);

						if (query.shouldFail) {
							throw new Error(
								`Query ${query.name} should have failed but succeeded`,
							);
						}

						if (query.expectedResult !== undefined) {
							// Simple deep equality check
							const resultStr = JSON.stringify(result);
							const expectedStr = JSON.stringify(query.expectedResult);

							if (resultStr !== expectedStr) {
								throw new Error(
									`Query ${query.name} result mismatch.\nExpected: ${expectedStr}\nActual: ${resultStr}`,
								);
							}
						}

						console.log(`✅ Query passed: ${query.name}`);
					} catch (error) {
						if (query.shouldFail) {
							console.log(`✅ Query correctly failed: ${query.name}`);
						} else {
							console.error(`❌ Query failed: ${query.name}`, error);
							throw error;
						}
					}
				}
			},
			{ parentBranch: options.parentBranch },
		);
	}
}

// Export configured instances
export const createNeonBranchingManager = (config: {
	apiKey: string;
	projectId: string;
}) => {
	return new NeonBranchingManager(config);
};

export const createNeonTestUtils = (branchingManager: NeonBranchingManager) => {
	return new NeonTestUtils(branchingManager);
};
