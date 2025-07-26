// PR Integration API layer
import type { PRData } from "@/components/features/pr-integration/pr-status-card";

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface PRFilters {
	status?: ("draft" | "open" | "merged" | "closed")[];
	author?: string[];
	assignee?: string[];
	reviewer?: string[];
	branch?: string;
	search?: string;
}

export interface PRListResponse {
	prs: PRData[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

export interface TaskPRLink {
	taskId: string;
	prId: string;
	linkedAt: Date;
	linkedBy: string;
}

class PRAPIError extends Error {
	constructor(
		message: string,
		public status: number,
		public code?: string
	) {
		super(message);
		this.name = "PRAPIError";
	}
}

// HTTP client wrapper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	const config: RequestInit = {
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
		...options,
	};

	try {
		const response = await fetch(url, config);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new PRAPIError(
				errorData.message || `HTTP ${response.status}: ${response.statusText}`,
				response.status,
				errorData.code
			);
		}

		return await response.json();
	} catch (error) {
		if (error instanceof PRAPIError) {
			throw error;
		}

		throw new PRAPIError(
			`Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
			0
		);
	}
}

// PR Integration API service
export const prAPI = {
	// Get all PRs with filtering and pagination
	async getPRs(filters?: PRFilters, page = 1, limit = 20): Promise<PRListResponse> {
		const params = new URLSearchParams();

		if (filters) {
			if (filters.status?.length) {
				params.append("status", filters.status.join(","));
			}
			if (filters.author?.length) {
				params.append("author", filters.author.join(","));
			}
			if (filters.assignee?.length) {
				params.append("assignee", filters.assignee.join(","));
			}
			if (filters.reviewer?.length) {
				params.append("reviewer", filters.reviewer.join(","));
			}
			if (filters.branch) {
				params.append("branch", filters.branch);
			}
			if (filters.search) {
				params.append("search", filters.search);
			}
		}

		params.append("page", page.toString());
		params.append("limit", limit.toString());

		const queryString = params.toString();
		const endpoint = `/prs${queryString ? `?${queryString}` : ""}`;

		return apiRequest<PRListResponse>(endpoint);
	},

	// Get a single PR by ID
	async getPR(prId: string): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}`);
	},

	// Refresh PR data from GitHub/GitLab
	async refreshPR(prId: string): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}/refresh`, {
			method: "POST",
		});
	},

	// Get PRs linked to a specific task
	async getTaskPRs(taskId: string): Promise<PRData[]> {
		return apiRequest<PRData[]>(`/tasks/${taskId}/prs`);
	},

	// Get tasks linked to a specific PR
	async getPRTasks(prId: string): Promise<string[]> {
		return apiRequest<string[]>(`/prs/${prId}/tasks`);
	},

	// Link a PR to a task
	async linkPRToTask(prId: string, taskId: string): Promise<TaskPRLink> {
		return apiRequest<TaskPRLink>("/pr-links", {
			method: "POST",
			body: JSON.stringify({ prId, taskId }),
		});
	},

	// Unlink a PR from a task
	async unlinkPRFromTask(prId: string, taskId: string): Promise<void> {
		await apiRequest<void>(`/pr-links/${prId}/${taskId}`, {
			method: "DELETE",
		});
	},

	// Get all PR-task links
	async getPRLinks(taskId?: string, prId?: string): Promise<TaskPRLink[]> {
		const params = new URLSearchParams();
		if (taskId) params.append("taskId", taskId);
		if (prId) params.append("prId", prId);

		const queryString = params.toString();
		const endpoint = `/pr-links${queryString ? `?${queryString}` : ""}`;

		return apiRequest<TaskPRLink[]>(endpoint);
	},

	// PR Actions
	async mergePR(
		prId: string,
		options?: {
			commitTitle?: string;
			commitMessage?: string;
			mergeMethod?: "merge" | "squash" | "rebase";
		}
	): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}/merge`, {
			method: "POST",
			body: JSON.stringify(options || {}),
		});
	},

	async closePR(prId: string): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}/close`, {
			method: "POST",
		});
	},

	async reopenPR(prId: string): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}/reopen`, {
			method: "POST",
		});
	},

	async convertToDraft(prId: string): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}/convert-to-draft`, {
			method: "POST",
		});
	},

	async markReadyForReview(prId: string): Promise<PRData> {
		return apiRequest<PRData>(`/prs/${prId}/ready-for-review`, {
			method: "POST",
		});
	},

	// Comments and Reviews
	async addComment(prId: string, comment: string): Promise<void> {
		await apiRequest<void>(`/prs/${prId}/comments`, {
			method: "POST",
			body: JSON.stringify({ comment }),
		});
	},

	async requestReview(prId: string, reviewers: string[]): Promise<void> {
		await apiRequest<void>(`/prs/${prId}/request-review`, {
			method: "POST",
			body: JSON.stringify({ reviewers }),
		});
	},

	async approveReview(prId: string, comment?: string): Promise<void> {
		await apiRequest<void>(`/prs/${prId}/approve`, {
			method: "POST",
			body: JSON.stringify({ comment }),
		});
	},

	async requestChanges(prId: string, comment: string): Promise<void> {
		await apiRequest<void>(`/prs/${prId}/request-changes`, {
			method: "POST",
			body: JSON.stringify({ comment }),
		});
	},

	// Webhooks and Events
	async setupWebhook(
		repositoryUrl: string,
		events: string[]
	): Promise<{
		webhookId: string;
		webhookUrl: string;
		events: string[];
	}> {
		return apiRequest("/prs/webhook", {
			method: "POST",
			body: JSON.stringify({ repositoryUrl, events }),
		});
	},

	async removeWebhook(webhookId: string): Promise<void> {
		await apiRequest<void>(`/prs/webhook/${webhookId}`, {
			method: "DELETE",
		});
	},

	// Analytics
	async getPRAnalytics(
		filters?: PRFilters,
		dateRange?: { from: Date; to: Date }
	): Promise<{
		totalPRs: number;
		mergedPRs: number;
		closedPRs: number;
		openPRs: number;
		draftPRs: number;
		averageMergeTime: number;
		averageReviewTime: number;
		prsByAuthor: Record<string, number>;
		prsByStatus: Record<string, number>;
		mergeRate: number;
	}> {
		const params = new URLSearchParams();

		if (filters) {
			if (filters.author?.length) {
				params.append("author", filters.author.join(","));
			}
			if (filters.status?.length) {
				params.append("status", filters.status.join(","));
			}
		}

		if (dateRange) {
			params.append("from", dateRange.from.toISOString());
			params.append("to", dateRange.to.toISOString());
		}

		const queryString = params.toString();
		const endpoint = `/prs/analytics${queryString ? `?${queryString}` : ""}`;

		return apiRequest(endpoint);
	},

	// Repository Integration
	async connectRepository(
		provider: "github" | "gitlab" | "bitbucket",
		repositoryUrl: string,
		accessToken: string
	): Promise<{
		repositoryId: string;
		name: string;
		fullName: string;
		connected: boolean;
	}> {
		return apiRequest("/prs/repositories", {
			method: "POST",
			body: JSON.stringify({ provider, repositoryUrl, accessToken }),
		});
	},

	async disconnectRepository(repositoryId: string): Promise<void> {
		await apiRequest<void>(`/prs/repositories/${repositoryId}`, {
			method: "DELETE",
		});
	},

	async getConnectedRepositories(): Promise<
		Array<{
			repositoryId: string;
			name: string;
			fullName: string;
			provider: string;
			connected: boolean;
			lastSync: Date;
		}>
	> {
		return apiRequest("/prs/repositories");
	},
};
