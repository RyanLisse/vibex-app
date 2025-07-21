import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface GitHubBranch {
	name: string;
	commit: {
		sha: string;
		url: string;
	};
	protected: boolean;
}

// Mock GitHub API service
const mockGitHubService = {
	getBranches: async (
		repo: string,
		token?: string,
	): Promise<GitHubBranch[]> => {
		// Mock branches data
		return [
			{
				name: "main",
				commit: {
					sha: "abc123def456",
					url: "https://api.github.com/repos/owner/repo/commits/abc123def456",
				},
				protected: true,
			},
			{
				name: "develop",
				commit: {
					sha: "def456ghi789",
					url: "https://api.github.com/repos/owner/repo/commits/def456ghi789",
				},
				protected: false,
			},
			{
				name: "feature/auth-improvement",
				commit: {
					sha: "ghi789jkl012",
					url: "https://api.github.com/repos/owner/repo/commits/ghi789jkl012",
				},
				protected: false,
			},
		];
	},
};

// Helper functions to reduce early returns
function validateRepoParameters(repo: string | null) {
	if (!repo) {
		return NextResponse.json(
			{ error: "Missing repo parameter" },
			{ status: 400 },
		);
	}

	// Validate repo format (owner/repo)
	if (!repo.includes("/") || repo.split("/").length !== 2) {
		return NextResponse.json(
			{ error: "Invalid repo format. Use 'owner/repo'" },
			{ status: 400 },
		);
	}

	return null; // No validation errors
}

function handleGitHubError(error: unknown) {
	console.error("Error fetching GitHub branches:", error);

	// Handle different types of errors
	if (error instanceof Error) {
		if (error.message.includes("404")) {
			return NextResponse.json(
				{ error: "Repository not found" },
				{ status: 404 },
			);
		}

		if (error.message.includes("403")) {
			return NextResponse.json(
				{ error: "Access denied. Check your GitHub token permissions." },
				{ status: 403 },
			);
		}

		if (error.message.includes("401")) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}
	}

	return NextResponse.json(
		{ error: "Failed to fetch branches" },
		{ status: 500 },
	);
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const repo = searchParams.get("repo");
		const token = request.headers.get("authorization");

		// Validate parameters
		const validationError = validateRepoParameters(repo);
		if (validationError) {
			return validationError;
		}

		// Get branches from GitHub API
		const branches = await mockGitHubService.getBranches(
			repo!,
			token || undefined,
		);

		return NextResponse.json({
			success: true,
			data: {
				repository: repo!,
				branches,
				total: branches.length,
			},
		});
	} catch (error) {
		return handleGitHubError(error);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { repo, branchName, fromBranch = "main" } = body;

		// Validate required parameters
		if (!repo) {
			return NextResponse.json(
				{ error: "Missing repo parameter" },
				{ status: 400 },
			);
		}

		if (!branchName) {
			return NextResponse.json(
				{ error: "Missing branchName parameter" },
				{ status: 400 },
			);
		}

		// Validate branch name format
		if (!/^[a-zA-Z0-9._/-]+$/.test(branchName)) {
			return NextResponse.json(
				{ error: "Invalid branch name format" },
				{ status: 400 },
			);
		}

		// Mock branch creation
		const newBranch: GitHubBranch = {
			name: branchName,
			commit: {
				sha: "new123branch456",
				url: `https://api.github.com/repos/${repo}/commits/new123branch456`,
			},
			protected: false,
		};

		return NextResponse.json(
			{
				success: true,
				data: {
					repository: repo,
					branch: newBranch,
					message: `Branch '${branchName}' created from '${fromBranch}'`,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating GitHub branch:", error);

		return NextResponse.json(
			{ error: "Failed to create branch" },
			{ status: 500 },
		);
	}
}
