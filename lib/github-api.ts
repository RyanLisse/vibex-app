// GitHub API utility functions

/**
 * GitHub API client for interacting with GitHub REST API
 */
export class GitHubAPI {
	private token: string;
	private baseUrl = "https://api.github.com";

	constructor(token: string) {
		this.token = token;
	}

	/**
	 * Get the authenticated user
	 */
	async getUser() {
		const response = await fetch(`${this.baseUrl}/user`, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json();
	}

	/**
	 * Get repositories for the authenticated user
	 */
	async getRepositories(
		options: {
			sort?: "created" | "updated" | "pushed" | "full_name";
			per_page?: number;
			page?: number;
		} = {},
	) {
		const params = new URLSearchParams({
			sort: options.sort || "updated",
			per_page: String(options.per_page || 30),
			...(options.page && { page: String(options.page) }),
		});

		const response = await fetch(`${this.baseUrl}/user/repos?${params}`, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json();
	}

	/**
	 * Get branches for a repository
	 */
	async getBranches(owner: string, repo: string) {
		const response = await fetch(
			`${this.baseUrl}/repos/${owner}/${repo}/branches`,
			{
				headers: this.getHeaders(),
			},
		);

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json();
	}

	/**
	 * Create a new repository
	 */
	async createRepository(repo: {
		name: string;
		description?: string;
		private?: boolean;
		has_issues?: boolean;
		has_projects?: boolean;
		has_wiki?: boolean;
	}) {
		const response = await fetch(`${this.baseUrl}/user/repos`, {
			method: "POST",
			headers: {
				...this.getHeaders(),
				"Content-Type": "application/json",
			},
			body: JSON.stringify(repo),
		});

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json();
	}

	/**
	 * Get default headers for API requests
	 */
	private getHeaders() {
		return {
			Authorization: `Bearer ${this.token}`,
			Accept: "application/vnd.github.v3+json",
		};
	}
}
