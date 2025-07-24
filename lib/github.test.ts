import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubAuth } from "./github";

// Mock fetch
global.fetch = vi.fn();

describe("GitHubAuth", () => {
	const originalEnv = process.env;
	let githubAuth: GitHubAuth;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = {
			...originalEnv,
			GITHUB_CLIENT_ID: "test-client-id",
			GITHUB_CLIENT_SECRET: "test-client-secret",
			NEXT_PUBLIC_APP_URL: "http://localhost:3000",
		};
		githubAuth = new GitHubAuth();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("constructor", () => {
		it("should initialize with environment variables", () => {
			expect(githubAuth).toBeInstanceOf(GitHubAuth);
		});

		it("should use NEXT_PUBLIC_APP_URL for redirect URI", () => {
			const url = githubAuth.getAuthUrl("test-state");
			expect(url).toContain(
				"redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgithub%2Fcallback"
			);
		});

		it("should use production default when NODE_ENV is production", () => {
			process.env.NODE_ENV = "production";
			delete process.env.NEXT_PUBLIC_APP_URL;
			const prodAuth = new GitHubAuth();
			const url = prodAuth.getAuthUrl("test-state");
			expect(url).toContain(
				"redirect_uri=https%3A%2F%2Fvibex-app.vercel.app%2Fapi%2Fauth%2Fgithub%2Fcallback"
			);
		});

		it("should use localhost default in development", () => {
			delete process.env.NEXT_PUBLIC_APP_URL;
			process.env.NODE_ENV = "development";
			const devAuth = new GitHubAuth();
			const url = devAuth.getAuthUrl("test-state");
			expect(url).toContain(
				"redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgithub%2Fcallback"
			);
		});
	});

	describe("getAuthUrl", () => {
		it("should generate OAuth URL with correct parameters", () => {
			const url = githubAuth.getAuthUrl("test-state");
			const parsedUrl = new URL(url);

			expect(parsedUrl.origin).toBe("https://github.com");
			expect(parsedUrl.pathname).toBe("/login/oauth/authorize");
			expect(parsedUrl.searchParams.get("client_id")).toBe("test-client-id");
			expect(parsedUrl.searchParams.get("scope")).toBe("repo user:email");
			expect(parsedUrl.searchParams.get("state")).toBe("test-state");
		});

		it("should generate random state when not provided", () => {
			const url = githubAuth.getAuthUrl();
			const parsedUrl = new URL(url);
			const state = parsedUrl.searchParams.get("state");

			expect(state).toBeTruthy();
			expect(state!.length).toBeGreaterThanOrEqual(6);
			expect(state!.length).toBeLessThanOrEqual(8); // More flexible range for random generation
			// Verify it's a valid base36 string (only alphanumeric characters)
			expect(state).toMatch(/^[a-z0-9]+$/);
		});
	});

	describe("exchangeCodeForToken", () => {
		it("should exchange code for access token successfully", async () => {
			const mockResponse = {
				access_token: "test-access-token",
				token_type: "bearer",
				scope: "repo,user:email",
			};

			(global.fetch as any).mockResolvedValueOnce({
				json: () => Promise.resolve(mockResponse),
			});

			const token = await githubAuth.exchangeCodeForToken("test-code");

			expect(token).toBe("test-access-token");
			expect(global.fetch).toHaveBeenCalledWith("https://github.com/login/oauth/access_token", {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: "test-client-id",
					client_secret: "test-client-secret",
					code: "test-code",
				}),
			});
		});

		it("should throw error when GitHub returns error", async () => {
			const mockResponse = {
				error: "bad_verification_code",
				error_description: "The code passed is incorrect or expired.",
			};

			(global.fetch as any).mockResolvedValueOnce({
				json: () => Promise.resolve(mockResponse),
			});

			await expect(githubAuth.exchangeCodeForToken("invalid-code")).rejects.toThrow(
				"GitHub OAuth error: The code passed is incorrect or expired."
			);
		});
	});

	describe("getUser", () => {
		it("should fetch user data with valid token", async () => {
			const mockUser = {
				id: 12345,
				login: "testuser",
				avatar_url: "https://github.com/images/error/testuser.png",
				name: "Test User",
				email: "test@example.com",
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUser),
			});

			const user = await githubAuth.getUser("test-token");

			expect(user).toEqual(mockUser);
			expect(global.fetch).toHaveBeenCalledWith("https://api.github.com/user", {
				headers: {
					Authorization: "Bearer test-token",
					Accept: "application/vnd.github.v3+json",
				},
			});
		});

		it("should throw error when API request fails", async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 401,
			});

			await expect(githubAuth.getUser("invalid-token")).rejects.toThrow("GitHub API error: 401");
		});
	});

	describe("getUserRepositories", () => {
		it("should fetch repositories with valid token", async () => {
			const mockRepos = [
				{
					id: 1,
					name: "test-repo",
					full_name: "testuser/test-repo",
					private: false,
					html_url: "https://github.com/testuser/test-repo",
					clone_url: "https://github.com/testuser/test-repo.git",
					ssh_url: "git@github.com:testuser/test-repo.git",
					default_branch: "main",
					fork: false,
					archived: false,
					language: "TypeScript",
					stargazers_count: 5,
					forks_count: 2,
					open_issues_count: 1,
					size: 1024,
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-12-01T00:00:00Z",
					pushed_at: "2023-12-01T00:00:00Z",
					owner: {
						id: 12345,
						login: "testuser",
						avatar_url: "https://github.com/images/error/testuser.png",
						name: "Test User",
						email: "test@example.com",
					},
				},
			];

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockRepos),
			});

			const repos = await githubAuth.getUserRepositories("test-token");

			expect(repos).toEqual(mockRepos);
			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.github.com/user/repos?sort=updated&per_page=100",
				{
					headers: {
						Authorization: "Bearer test-token",
						Accept: "application/vnd.github.v3+json",
					},
				}
			);
		});

		it("should throw error when API request fails", async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 403,
			});

			await expect(githubAuth.getUserRepositories("invalid-token")).rejects.toThrow(
				"GitHub API error: 403"
			);
		});
	});
});
