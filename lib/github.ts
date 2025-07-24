export interface GitHubBranch {
	name: string;
	commit: {
		sha: string;
		url: string;
	};
	protected: boolean;
	isDefault: boolean;
}

export interface GitHubRepository {
	id: number;
	name: string;
	full_name: string;
	private: boolean;
	description?: string;
	html_url: string;
	clone_url: string;
	ssh_url: string;
	default_branch: string;
	fork: boolean;
	archived: boolean;
	disabled?: boolean;
	language: string | null;
	stargazers_count: number;
	watchers_count?: number;
	forks_count: number;
	open_issues_count: number;
	size: number;
	created_at: string;
	updated_at: string;
	pushed_at: string;
	permissions?: {
		admin: boolean;
		push: boolean;
		pull: boolean;
	};
	owner: GitHubUser;
}

export interface GitHubUser {
	id: number;
	login: string;
	avatar_url: string;
	name?: string;
	email?: string;
}

export class GitHubAuth {
	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;

	constructor() {
		this.clientId = process.env.GITHUB_CLIENT_ID!;
		this.clientSecret = process.env.GITHUB_CLIENT_SECRET!;

		// Allow override via environment variable, otherwise use defaults
		if (process.env.GITHUB_REDIRECT_URI) {
			this.redirectUri = process.env.GITHUB_REDIRECT_URI;
		} else if (process.env.NEXT_PUBLIC_APP_URL) {
			// Use the app URL from environment if available
			this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`;
		} else if (process.env.NODE_ENV === "production") {
			// Production default
			this.redirectUri = "https://vibex-app.vercel.app/api/auth/github/callback";
		} else {
			// Local development default
			this.redirectUri = "http://localhost:3000/api/auth/github/callback";
		}

		// Log the redirect URI for debugging
		if (process.env.NODE_ENV === "development") {
		}
	}

	// Generate GitHub OAuth URL
	getAuthUrl(state?: string): string {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			scope: "repo user:email",
			state: state || Math.random().toString(36).substring(2, 8),
		});

		return `https://github.com/login/oauth/authorize?${params.toString()}`;
	}

	// Exchange code for access token
	async exchangeCodeForToken(code: string): Promise<string> {
		const response = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: this.clientId,
				client_secret: this.clientSecret,
				code,
			}),
		});

		const data = await response.json();

		if (data.error) {
			throw new Error(`GitHub OAuth error: ${data.error_description}`);
		}

		return data.access_token;
	}

	// Get user information
	async getUser(accessToken: string): Promise<GitHubUser> {
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const userData = await response.json();
		return userData as GitHubUser;
	}

	// Get user repositories
	async getUserRepositories(accessToken: string): Promise<GitHubRepository[]> {
		const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const reposData = await response.json();
		return reposData as GitHubRepository[];
	}
}
