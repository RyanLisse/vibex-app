/**
 * Shared PR Integration Mock Factories
 *
 * Eliminates duplicate mock PR data patterns by providing
 * reusable mock objects and test utilities for PR integration.
 */

import { vi } from "vitest";

/**
 * Mock PR status data
 */
export interface MockPRStatus {
	prId: string;
	title: string;
	status: "open" | "closed" | "merged";
	reviewStatus: "pending" | "approved" | "changes_requested" | "dismissed";
	mergeable: boolean;
	repository: string;
	branch: string;
	author: string;
	createdAt: string;
	updatedAt: string;
	reviewers: Array<{
		login: string;
		status: "requested" | "approved" | "changes_requested" | "dismissed";
	}>;
	checks: Array<{
		name: string;
		status: "pending" | "success" | "failure" | "error";
		conclusion: string | null;
		url: string;
	}>;
}

/**
 * Mock PR merge result data
 */
export interface MockPRMergeResult {
	merged: boolean;
	mergeCommitSha: string;
	mergedAt: string;
	mergeMethod: string;
	sourceBranchDeleted: boolean;
}

/**
 * PR mock data factory
 */
export class PRMockFactory {
	private static counter = 0;

	/**
	 * Create a basic PR status mock
	 */
	static createPRStatus(overrides: Partial<MockPRStatus> = {}): MockPRStatus {
		const prNumber = ++PRMockFactory.counter;
		const repository = overrides.repository || "test-org/test-repo";

		return {
			prId: `pr-${prNumber}`,
			title: "Feature: Add new task management functionality",
			status: "open",
			reviewStatus: "pending",
			mergeable: true,
			repository,
			branch: `feature/task-management-${prNumber}`,
			author: "dev-user",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			reviewers: [
				{
					login: "senior-dev",
					status: "approved",
				},
				{
					login: "tech-lead",
					status: "requested",
				},
			],
			checks: [
				{
					name: "CI/CD Pipeline",
					status: "success",
					conclusion: "success",
					url: `https://github.com/${repository}/actions`,
				},
				{
					name: "Code Quality",
					status: "success",
					conclusion: "success",
					url: `https://sonarcloud.io/project/${repository}`,
				},
				{
					name: "Security Scan",
					status: "pending",
					conclusion: null,
					url: `https://github.com/${repository}/security`,
				},
			],
			...overrides,
		};
	}

	/**
	 * Create an open PR ready for review
	 */
	static createOpenPR(overrides: Partial<MockPRStatus> = {}): MockPRStatus {
		return PRMockFactory.createPRStatus({
			status: "open",
			reviewStatus: "pending",
			mergeable: true,
			...overrides,
		});
	}

	/**
	 * Create a PR ready to merge (approved and all checks pass)
	 */
	static createReadyToMergePR(
		overrides: Partial<MockPRStatus> = {},
	): MockPRStatus {
		return PRMockFactory.createPRStatus({
			status: "open",
			reviewStatus: "approved",
			mergeable: true,
			checks: [
				{
					name: "CI/CD Pipeline",
					status: "success",
					conclusion: "success",
					url: `https://github.com/${overrides.repository || "test-org/test-repo"}/actions`,
				},
				{
					name: "Code Quality",
					status: "success",
					conclusion: "success",
					url: `https://sonarcloud.io/project/${overrides.repository || "test-org/test-repo"}`,
				},
				{
					name: "Security Scan",
					status: "success",
					conclusion: "success",
					url: `https://github.com/${overrides.repository || "test-org/test-repo"}/security`,
				},
			],
			...overrides,
		});
	}

	/**
	 * Create a PR with failing checks
	 */
	static createFailingChecksPR(
		overrides: Partial<MockPRStatus> = {},
	): MockPRStatus {
		return PRMockFactory.createPRStatus({
			status: "open",
			reviewStatus: "approved",
			mergeable: true,
			checks: [
				{
					name: "CI/CD Pipeline",
					status: "failure",
					conclusion: "failure",
					url: `https://github.com/${overrides.repository || "test-org/test-repo"}/actions`,
				},
				{
					name: "Code Quality",
					status: "success",
					conclusion: "success",
					url: `https://sonarcloud.io/project/${overrides.repository || "test-org/test-repo"}`,
				},
				{
					name: "Security Scan",
					status: "error",
					conclusion: "error",
					url: `https://github.com/${overrides.repository || "test-org/test-repo"}/security`,
				},
			],
			...overrides,
		});
	}

	/**
	 * Create a PR with merge conflicts
	 */
	static createConflictedPR(
		overrides: Partial<MockPRStatus> = {},
	): MockPRStatus {
		return PRMockFactory.createPRStatus({
			status: "open",
			reviewStatus: "approved",
			mergeable: false,
			...overrides,
		});
	}

	/**
	 * Create a merged PR
	 */
	static createMergedPR(overrides: Partial<MockPRStatus> = {}): MockPRStatus {
		return PRMockFactory.createPRStatus({
			status: "merged",
			reviewStatus: "approved",
			mergeable: false,
			...overrides,
		});
	}

	/**
	 * Create a closed (not merged) PR
	 */
	static createClosedPR(overrides: Partial<MockPRStatus> = {}): MockPRStatus {
		return PRMockFactory.createPRStatus({
			status: "closed",
			reviewStatus: "dismissed",
			mergeable: false,
			...overrides,
		});
	}

	/**
	 * Create PR merge result
	 */
	static createMergeResult(
		overrides: Partial<MockPRMergeResult> = {},
	): MockPRMergeResult {
		return {
			merged: true,
			mergeCommitSha: "abc123def456789",
			mergedAt: new Date().toISOString(),
			mergeMethod: "squash",
			sourceBranchDeleted: true,
			...overrides,
		};
	}

	/**
	 * Create failed merge result
	 */
	static createFailedMergeResult(
		overrides: Partial<MockPRMergeResult> = {},
	): MockPRMergeResult {
		return {
			merged: false,
			mergeCommitSha: "",
			mergedAt: "",
			mergeMethod: "squash",
			sourceBranchDeleted: false,
			...overrides,
		};
	}
}

/**
 * GitHub API client mock
 */
export class MockGitHubAPIClient {
	static responses = new Map<string, MockPRStatus>();
	static errors = new Map<string, Error>();
	static delays = new Map<string, number>();

	/**
	 * Set mock response for a specific PR
	 */
	static mockPRStatus(
		prNumber: string,
		repository: string,
		prStatus: MockPRStatus,
	) {
		const key = `${repository}:${prNumber}`;
		MockGitHubAPIClient.responses.set(key, prStatus);
	}

	/**
	 * Set mock error for a specific PR
	 */
	static mockPRError(prNumber: string, repository: string, error: Error) {
		const key = `${repository}:${prNumber}`;
		MockGitHubAPIClient.errors.set(key, error);
	}

	/**
	 * Set mock delay for API calls
	 */
	static mockDelay(prNumber: string, repository: string, delayMs: number) {
		const key = `${repository}:${prNumber}`;
		MockGitHubAPIClient.delays.set(key, delayMs);
	}

	/**
	 * Mock getPRStatus method
	 */
	static async getPRStatus(
		repository: string,
		prNumber: string,
	): Promise<MockPRStatus> {
		const key = `${repository}:${prNumber}`;

		// Simulate delay if configured
		const delay = MockGitHubAPIClient.delays.get(key) || 100;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Check for configured errors
		const error = MockGitHubAPIClient.errors.get(key);
		if (error) {
			throw error;
		}

		// Return configured response or default
		return (
			MockGitHubAPIClient.responses.get(key) ||
			PRMockFactory.createPRStatus({
				prId: `pr-${prNumber}`,
				repository,
			})
		);
	}

	/**
	 * Mock mergePR method
	 */
	static async mergePR(
		repository: string,
		prNumber: string,
		options: {
			mergeMethod: string;
			deleteSourceBranch: boolean;
		},
	): Promise<MockPRMergeResult> {
		const key = `${repository}:${prNumber}:merge`;

		// Simulate merge delay
		const delay = MockGitHubAPIClient.delays.get(key) || 2000;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Check for configured errors
		const error = MockGitHubAPIClient.errors.get(key);
		if (error) {
			throw error;
		}

		// Return successful merge result
		return PRMockFactory.createMergeResult({
			mergeMethod: options.mergeMethod,
			sourceBranchDeleted: options.deleteSourceBranch,
		});
	}

	/**
	 * Clear all mocks
	 */
	static clearMocks() {
		MockGitHubAPIClient.responses.clear();
		MockGitHubAPIClient.errors.clear();
		MockGitHubAPIClient.delays.clear();
	}
}

/**
 * PR integration test scenarios
 */
export class PRIntegrationTestScenarios {
	/**
	 * Create mock task with PR links
	 */
	static createTaskWithPRs(
		taskId = "task-1",
		prLinks: Array<{
			prId: string;
			repository: string;
			autoUpdateStatus?: boolean;
		}> = [],
	) {
		return {
			id: taskId,
			title: "Test Task",
			status: "in_progress",
			metadata: {
				prLinks: prLinks.map((link) => ({
					prId: link.prId,
					repository: link.repository,
					branch: `feature/task-${taskId}`,
					autoUpdateStatus: link.autoUpdateStatus || false,
					linkedAt: new Date().toISOString(),
					linkedBy: "test-user",
				})),
				prStatuses: Object.fromEntries(
					prLinks.map((link) => [
						link.prId,
						PRMockFactory.createPRStatus({
							prId: link.prId,
							repository: link.repository,
						}),
					]),
				),
			},
		};
	}

	/**
	 * Create PR statistics mock
	 */
	static createPRStatistics(
		overrides: Partial<{
			totalLinkedPRs: number;
			openPRs: number;
			mergedPRs: number;
			pendingReview: number;
			readyToMerge: number;
		}> = {},
	) {
		return {
			totalLinkedPRs: 5,
			openPRs: 3,
			mergedPRs: 2,
			pendingReview: 2,
			readyToMerge: 1,
			...overrides,
		};
	}

	/**
	 * Standard test cases for PR integration
	 */
	static getStandardTestCases() {
		return {
			openPR: PRMockFactory.createOpenPR(),
			readyToMergePR: PRMockFactory.createReadyToMergePR(),
			failingChecksPR: PRMockFactory.createFailingChecksPR(),
			conflictedPR: PRMockFactory.createConflictedPR(),
			mergedPR: PRMockFactory.createMergedPR(),
			closedPR: PRMockFactory.createClosedPR(),
			successfulMerge: PRMockFactory.createMergeResult(),
			failedMerge: PRMockFactory.createFailedMergeResult(),
		};
	}
}

/**
 * PR integration service mocks
 */
export class PRIntegrationServiceMock {
	static create() {
		return {
			linkTaskToPR: vi.fn(),
			updatePRStatus: vi.fn(),
			getPRIntegrationData: vi.fn(),
			mergePR: vi.fn(),
		};
	}

	static createWithDefaultBehavior() {
		const mock = PRIntegrationServiceMock.create();

		// Setup default successful responses
		mock.linkTaskToPR.mockResolvedValue({
			task: PRIntegrationTestScenarios.createTaskWithPRs(),
			prStatus: PRMockFactory.createOpenPR(),
			link: {
				prId: "pr-1",
				repository: "test-org/test-repo",
				autoUpdateStatus: false,
				linkedAt: new Date().toISOString(),
			},
		});

		mock.updatePRStatus.mockResolvedValue({
			prStatus: PRMockFactory.createOpenPR(),
			updatedTasks: [PRIntegrationTestScenarios.createTaskWithPRs()],
			autoUpdatedCount: 0,
		});

		mock.getPRIntegrationData.mockResolvedValue({
			tasks: [PRIntegrationTestScenarios.createTaskWithPRs()],
			statistics: PRIntegrationTestScenarios.createPRStatistics(),
		});

		mock.mergePR.mockResolvedValue({
			mergeResult: PRMockFactory.createMergeResult(),
			prStatus: PRMockFactory.createMergedPR(),
			linkedTasks: [PRIntegrationTestScenarios.createTaskWithPRs()],
			autoCompletedTasks: [],
			summary: {
				totalLinkedTasks: 1,
				autoCompletedTasks: 0,
				mergeCommitSha: "abc123def456789",
			},
		});

		return mock;
	}
}

/**
 * GitHub webhook payload mocks
 */
export class GitHubWebhookMockFactory {
	/**
	 * Create PR opened webhook payload
	 */
	static createPROpenedPayload(prData: Partial<MockPRStatus> = {}) {
		const pr = PRMockFactory.createOpenPR(prData);
		return {
			action: "opened",
			pull_request: {
				id: parseInt(pr.prId.replace("pr-", "")),
				number: parseInt(pr.prId.replace("pr-", "")),
				title: pr.title,
				state: pr.status,
				mergeable: pr.mergeable,
				base: {
					repo: {
						full_name: pr.repository,
					},
				},
				head: {
					ref: pr.branch,
				},
				user: {
					login: pr.author,
				},
				created_at: pr.createdAt,
				updated_at: pr.updatedAt,
			},
			repository: {
				full_name: pr.repository,
			},
		};
	}

	/**
	 * Create PR merged webhook payload
	 */
	static createPRMergedPayload(prData: Partial<MockPRStatus> = {}) {
		const pr = PRMockFactory.createMergedPR(prData);
		return {
			action: "closed",
			pull_request: {
				id: parseInt(pr.prId.replace("pr-", "")),
				number: parseInt(pr.prId.replace("pr-", "")),
				title: pr.title,
				state: "closed",
				merged: true,
				mergeable: false,
				merge_commit_sha: "abc123def456789",
				base: {
					repo: {
						full_name: pr.repository,
					},
				},
				head: {
					ref: pr.branch,
				},
				user: {
					login: pr.author,
				},
			},
			repository: {
				full_name: pr.repository,
			},
		};
	}

	/**
	 * Create review submitted webhook payload
	 */
	static createReviewSubmittedPayload(
		prData: Partial<MockPRStatus> = {},
		reviewState: "approved" | "changes_requested" | "commented" = "approved",
	) {
		const pr = PRMockFactory.createOpenPR(prData);
		return {
			action: "submitted",
			pull_request: {
				id: parseInt(pr.prId.replace("pr-", "")),
				number: parseInt(pr.prId.replace("pr-", "")),
				title: pr.title,
				state: pr.status,
			},
			review: {
				state: reviewState,
				user: {
					login: "reviewer-user",
				},
				submitted_at: new Date().toISOString(),
			},
			repository: {
				full_name: pr.repository,
			},
		};
	}
}
