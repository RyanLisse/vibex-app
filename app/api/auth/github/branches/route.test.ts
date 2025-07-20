import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import { vi } from "vitest";
import { GET } from "@/app/api/auth/github/branches/route";

// Mock GitHub auth utilities
vi.mock("@/lib/github", () => ({
	GitHubAuth: vi.fn(() => ({
		fetchBranches: vi.fn(),
	})),
}));

// Mock NextResponse
vi.mock("next/server", () => ({
	NextRequest: vi.fn(),
	NextResponse: {
		json: vi.fn(),
		redirect: vi.fn(),
	},
}));

// Define mock functions for the test
const mockGetGitHubAccessToken = vi.fn();
const mockFetchGitHubBranches = vi.fn();

const mockNextResponse = (await import("next/server" as any)).NextResponse;

describe("GET /api/auth/github/branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
describe('GET /api/auth/github/branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

	it("should return branches for valid repository", async () => {
		const mockBranches = [
			{ name: "main", sha: "abc123", protected: false },
			{ name: "develop", sha: "def456", protected: true },
			{ name: "feature/test", sha: "ghi789", protected: false },
		];

		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockFetchGitHubBranches.mockResolvedValue(mockBranches);
		mockNextResponse.json.mockReturnValue(mockBranches as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo",
		);

		const _response = await GET(request);

		expect(mockGetGitHubAccessToken).toHaveBeenCalledWith(request);
		expect(mockFetchGitHubBranches).toHaveBeenCalledWith(
			"github-token",
			"owner/repo",
		);
		expect(mockNextResponse.json).toHaveBeenCalledWith(mockBranches);
	});

	it("should handle missing repository parameter", async () => {
		mockNextResponse.json.mockReturnValue({
			error: "Repository parameter is required",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Repository parameter is required" },
			{ status: 400 },
		);
	});

	it("should handle missing access token", async () => {
		mockGetGitHubAccessToken.mockResolvedValue(null);
		mockNextResponse.json.mockReturnValue({ error: "Unauthorized" } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo",
		);

		const _response = await GET(request);

		expect(mockGetGitHubAccessToken).toHaveBeenCalledWith(request);
		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Unauthorized" },
			{ status: 401 },
		);
	});

	it("should handle GitHub API errors", async () => {
		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockFetchGitHubBranches.mockRejectedValue(
			new Error("Repository not found"),
		);
		mockNextResponse.json.mockReturnValue({
			error: "Repository not found",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/nonexistent",
		);

		const _response = await GET(request);

		expect(mockFetchGitHubBranches).toHaveBeenCalledWith(
			"github-token",
			"owner/nonexistent",
		);
		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Repository not found" },
			{ status: 404 },
		);
	});

	it("should handle invalid repository format", async () => {
		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockNextResponse.json.mockReturnValue({
			error: "Invalid repository format",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=invalid-repo",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Invalid repository format" },
			{ status: 400 },
		);
	});

	it("should handle network errors", async () => {
		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockFetchGitHubBranches.mockRejectedValue(new Error("Network error"));
		mockNextResponse.json.mockReturnValue({ error: "Network error" } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Network error" },
			{ status: 500 },
		);
	});

	it("should handle rate limiting", async () => {
		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		const rateLimitError = new Error("API rate limit exceeded");
		rateLimitError.name = "RateLimitError";
		mockFetchGitHubBranches.mockRejectedValue(rateLimitError);
		mockNextResponse.json.mockReturnValue({
			error: "Rate limit exceeded",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Rate limit exceeded" },
			{ status: 429 },
		);
	});

	it("should handle empty repository name", async () => {
		mockNextResponse.json.mockReturnValue({
			error: "Repository parameter is required",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Repository parameter is required" },
			{ status: 400 },
		);
	});

	it("should handle successful response with empty branches", async () => {
		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockFetchGitHubBranches.mockResolvedValue([]);
		mockNextResponse.json.mockReturnValue([] as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/empty-repo",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith([]);
	});

	it("should handle branches with different protection statuses", async () => {
		const mockBranches = [
			{ name: "main", sha: "abc123", protected: true },
			{ name: "staging", sha: "def456", protected: true },
			{ name: "feature/unprotected", sha: "ghi789", protected: false },
		];

		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockFetchGitHubBranches.mockResolvedValue(mockBranches);
		mockNextResponse.json.mockReturnValue(mockBranches as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(mockBranches);
	});

	it("should handle authorization errors", async () => {
		mockGetGitHubAccessToken.mockRejectedValue(new Error("Token expired"));
		mockNextResponse.json.mockReturnValue({ error: "Unauthorized" } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Unauthorized" },
			{ status: 401 },
		);
	});

	it("should handle malformed repository URLs", async () => {
		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockNextResponse.json.mockReturnValue({
			error: "Invalid repository format",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo/extra/path",
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Invalid repository format" },
			{ status: 400 },
		);
	});

	it("should handle special characters in repository names", async () => {
		const mockBranches = [{ name: "main", sha: "abc123", protected: false }];

		mockGetGitHubAccessToken.mockResolvedValue("github-token");
		mockFetchGitHubBranches.mockResolvedValue(mockBranches);
		mockNextResponse.json.mockReturnValue(mockBranches as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/github/branches?repo=owner/repo-with-dashes",
		);

		const _response = await GET(request);

		expect(mockFetchGitHubBranches).toHaveBeenCalledWith(
			"github-token",
			"owner/repo-with-dashes",
		);
		expect(mockNextResponse.json).toHaveBeenCalledWith(mockBranches);
	});
});
