	afterEach,
	beforeEach,
	describe,
	import { expect,
	import { it,
	import { mock,
	import { spyOn,
	import { test
} from "bun:test";
import { WebhookResponseSchema
} from "./api-routes";

describe("API Routes Schemas", () => {
	describe("GitHub OAuth Schemas", () => {
		describe("GitHubOAuthCallbackSchema", () => {
			it("should validate OAuth callback with code", () => {
				const validCallback = {
					code: "auth_code_123",
					state: "random_state",
				};

				expect(() =>
GitHubOAuthCallbackSchema.parse(validCallback),
				).not.toThrow();
			});

			it("should validate OAuth callback with error", () => {
				const errorCallback = {
					code: "",
					error: "access_denied",
					error_description: "User denied access",
				};

				expect(() => GitHubOAuthCallbackSchema.parse(errorCallback)).toThrow(
					/required/,
				);
			});

			it("should require code to be non-empty", () => {
				const invalidCallback = { code: "" };
				expect(() => GitHubOAuthCallbackSchema.parse(invalidCallback)).toThrow(
					/required/,
				);
			});

			it("should make state and error fields optional", () => {
				const minimalCallback = { code: "auth_code_123" };
				expect(() =>
GitHubOAuthCallbackSchema.parse(minimalCallback),
				).not.toThrow();
			});
		});

		describe("GitHubOAuthUrlSchema", () => {
			it("should validate OAuth URL parameters", () => {
				const validUrl = {
					redirect_uri: "https://example.com/callback",
					scope: "user:email,repo",
					state: "random_state",
				};

				expect(() => GitHubOAuthUrlSchema.parse(validUrl)).not.toThrow();
			});

			it("should apply default scope", () => {
				const minimalUrl = { redirect_uri: "https://example.com/callback" };
				const result = GitHubOAuthUrlSchema.parse(minimalUrl);
				expect(result.scope).toBe("user:email,public_repo");
			});

			it("should validate redirect URI format", () => {
				const invalidUrl = { redirect_uri: "not-a-valid-url" };
				expect(() => GitHubOAuthUrlSchema.parse(invalidUrl)).toThrow(
					/Invalid redirect URI/,
				);
			});
		});

		describe("GitHubUserSchema", () => {
			it("should validate GitHub user data", () => {
				const validUser = {
					id: 12_345,
					login: "testuser",
					avatar_url: "https://github.com/avatar.jpg",
					name: "Test User",
					email: "test@example.com",
					bio: "Software developer",
					location: "San Francisco",
					company: "Test Company",
					html_url: "https://github.com/testuser",
					followers: 100,
					following: 50,
					public_repos: 25,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
				};

				expect(() => GitHubUserSchema.parse(validUser)).not.toThrow();
			});

			it("should handle nullable fields", () => {
				const userWithNulls = {
					id: 12_345,
					login: "testuser",
					avatar_url: "https://github.com/avatar.jpg",
					name: null,
					email: null,
					bio: null,
					location: null,
					company: null,
					html_url: "https://github.com/testuser",
					followers: 100,
					following: 50,
					public_repos: 25,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
				};

				expect(() => GitHubUserSchema.parse(userWithNulls)).not.toThrow();
			});

			it("should validate URL formats", () => {
				const invalidUser = {
					id: 12_345,
					login: "testuser",
					avatar_url: "not-a-url",
					html_url: "https://github.com/testuser",
					followers: 100,
					following: 50,
					public_repos: 25,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
				};

				expect(() => GitHubUserSchema.parse(invalidUser)).toThrow();
			});
		});

		describe("GitHubRepositorySchema", () => {
			it("should validate GitHub repository data", () => {
				const validRepo = {
					id: 12_345,
					name: "test-repo",
					full_name: "testuser/test-repo",
					description: "A test repository",
					html_url: "https://github.com/testuser/test-repo",
					clone_url: "https://github.com/testuser/test-repo.git",
					ssh_url: "git@github.com:testuser/test-repo.git",
					default_branch: "main",
					private: false,
					fork: false,
					archived: false,
					disabled: false,
					language: "JavaScript",
					stargazers_count: 100,
					watchers_count: 50,
					forks_count: 25,
					open_issues_count: 5,
					size: 1024,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					pushed_at: "2023-01-01T00:00:00Z",
					owner: {
						id: 12_345,
						login: "testuser",
						avatar_url: "https://github.com/avatar.jpg",
						name: "Test User",
						email: "test@example.com",
						bio: "Software developer",
						location: "San Francisco",
						company: "Test Company",
						html_url: "https://github.com/testuser",
						followers: 100,
						following: 50,
						public_repos: 25,
						created_at: "2020-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
				};

				expect(() => GitHubRepositorySchema.parse(validRepo)).not.toThrow();
			});

			it("should handle optional permissions", () => {
				const repoWithPermissions = {
					id: 12_345,
					name: "test-repo",
					full_name: "testuser/test-repo",
					description: "A test repository",
					html_url: "https://github.com/testuser/test-repo",
					clone_url: "https://github.com/testuser/test-repo.git",
					ssh_url: "git@github.com:testuser/test-repo.git",
					default_branch: "main",
					private: false,
					fork: false,
					archived: false,
					disabled: false,
					language: "JavaScript",
					stargazers_count: 100,
					watchers_count: 50,
					forks_count: 25,
					open_issues_count: 5,
					size: 1024,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					pushed_at: "2023-01-01T00:00:00Z",
					owner: {
						id: 12_345,
						login: "testuser",
						avatar_url: "https://github.com/avatar.jpg",
						name: "Test User",
						email: "test@example.com",
						bio: "Software developer",
						location: "San Francisco",
						company: "Test Company",
						html_url: "https://github.com/testuser",
						followers: 100,
						following: 50,
						public_repos: 25,
						created_at: "2020-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
					permissions: {
						admin: true,
						push: true,
						pull: true,
					},
				};

				expect(() =>
GitHubRepositorySchema.parse(repoWithPermissions),
				).not.toThrow();
			});
		});

		describe("GitHubBranchSchema", () => {
			it("should validate GitHub branch data", () => {
				const validBranch = {
					name: "main",
					commit: {
						sha: "abc123def456",
						url: "https://api.github.com/repos/user/repo/commits/abc123def456",
					},
					protected: false,
				};

				expect(() => GitHubBranchSchema.parse(validBranch)).not.toThrow();
			});

			it("should validate commit URL format", () => {
				const invalidBranch = {
					name: "main",
					commit: {
						sha: "abc123def456",
						url: "not-a-url",
					},
					protected: false,
				};

				expect(() => GitHubBranchSchema.parse(invalidBranch)).toThrow();
			});
		});

		describe("Request schemas", () => {
			describe("GitHubRepositoriesRequestSchema", () => {
				it("should validate repositories request", () => {
					const validRequest = {
						type: "owner" as const,
						sort: "created" as const,
						direction: "asc" as const,
						per_page: 50,
						page: 2,
					};

					expect(() =>
GitHubRepositoriesRequestSchema.parse(validRequest),
					).not.toThrow();
				});

				it("should apply default values", () => {
					const result = GitHubRepositoriesRequestSchema.parse({});
					expect(result.type).toBe("all");
					expect(result.sort).toBe("updated");
					expect(result.direction).toBe("desc");
					expect(result.per_page).toBe(30);
					expect(result.page).toBe(1);
				});

				it("should enforce per_page limits", () => {
					expect(() =>
GitHubRepositoriesRequestSchema.parse({ per_page: 0 }),
					).toThrow();
					expect(() =>