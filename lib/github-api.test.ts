import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type mock,
} from "bun:test";
import { vi } from "vitest";
import { GitHubAPI } from "@/lib/github-api";

describe.skip("GitHubAPI", () => {
	let api: GitHubAPI;
	const mockToken = "github-token-123";
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		api = new GitHubAPI(mockToken);
		fetchMock = vi.fn();
		global.fetch = fetchMock;
	});

	describe("constructor", () => {
		it("should initialize with token", () => {
			expect(api).toBeDefined();
			expect(api).toBeInstanceOf(GitHubAPI);
		});
	});

	describe("getUser", () => {
		it("should fetch user data successfully", async () => {
			const mockUser = {
				login: "testuser",
				id: 123,
				avatar_url: "https://avatar.url",
				name: "Test User",
			};

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => mockUser,
			} as Response);

			const result = await api.getUser();

			expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${mockToken}`,
					Accept: "application/vnd.github.v3+json",
				},
			});
			expect(result).toEqual(mockUser);
		});

		it("should throw error when response is not ok", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			} as Response);

			await expect(api.getUser()).rejects.toThrow(
				"GitHub API error: 401 Unauthorized",
			);
		});
	});

	describe("getRepositories", () => {
		it("should fetch repositories with default options", async () => {
			const mockRepos = [
				{ id: 1, name: "repo1", full_name: "user/repo1" },
				{ id: 2, name: "repo2", full_name: "user/repo2" },
			];

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => mockRepos,
			} as Response);

			const result = await api.getRepositories();

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.github.com/user/repos?sort=updated&per_page=30",
				{
					headers: {
						Authorization: `Bearer ${mockToken}`,
						Accept: "application/vnd.github.v3+json",
					},
				},
			);
			expect(result).toEqual(mockRepos);
		});

		it("should fetch repositories with custom options", async () => {
			const mockRepos = [{ id: 1, name: "repo1" }];

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => mockRepos,
			} as Response);

			const result = await api.getRepositories({
				sort: "created",
				per_page: 50,
				page: 2,
			});

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.github.com/user/repos?sort=created&per_page=50&page=2",
				expect.any(Object),
			);
			expect(result).toEqual(mockRepos);
		});
	});

	describe("getBranches", () => {
		it("should fetch branches for a repository", async () => {
			const mockBranches = [
				{ name: "main", protected: true },
				{ name: "develop", protected: false },
			];

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => mockBranches,
			} as Response);

			const result = await api.getBranches("user", "repo");

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.github.com/repos/user/repo/branches",
				{
					headers: {
						Authorization: `Bearer ${mockToken}`,
						Accept: "application/vnd.github.v3+json",
					},
				},
			);
			expect(result).toEqual(mockBranches);
		});

		it("should handle empty branch list", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			} as Response);

			const result = await api.getBranches("user", "repo");
			expect(result).toEqual([]);
		});
	});

	describe("createRepository", () => {
		it("should create a repository successfully", async () => {
			const newRepo = {
				name: "new-repo",
				description: "A new repository",
				private: false,
			};

			const mockResponse = {
				id: 123,
				name: "new-repo",
				full_name: "user/new-repo",
				...newRepo,
			};

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await api.createRepository(newRepo);

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.github.com/user/repos",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${mockToken}`,
						Accept: "application/vnd.github.v3+json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify(newRepo),
				},
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe("error handling", () => {
		it("should handle network errors", async () => {
			fetchMock.mockRejectedValueOnce(new Error("Network error"));

			await expect(api.getUser()).rejects.toThrow("Network error");
		});

		it("should handle 404 errors", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
			} as Response);

			await expect(api.getBranches("user", "nonexistent")).rejects.toThrow(
				"GitHub API error: 404 Not Found",
			);
		});

		it("should handle rate limit errors", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			} as Response);

			await expect(api.getRepositories()).rejects.toThrow(
				"GitHub API error: 429 Too Many Requests",
			);
		});
	});
});
