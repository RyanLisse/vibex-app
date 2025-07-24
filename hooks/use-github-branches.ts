"use client";

import { useCallback, useState } from "react";
import { useGitHubAuth } from "./use-github-auth";

interface GitHubBranch {
	name: string;
	commit?: {
		sha: string;
		url: string;
	};
	protected?: boolean;
}

interface BranchGroup {
	main: GitHubBranch[];
	feature: GitHubBranch[];
	bugfix: GitHubBranch[];
	hotfix: GitHubBranch[];
	release: GitHubBranch[];
	other: GitHubBranch[];
}

/**
 * Hook for managing GitHub branches
 */
export function useGitHubBranches() {
	const [branches, setBranches] = useState<GitHubBranch[]>([]);
	const [filteredBranches, setFilteredBranches] = useState<GitHubBranch[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { isAuthenticated, user } = useGitHubAuth();

	const fetchBranches = useCallback(
		async (repository: string) => {
			if (!isAuthenticated || !user) {
				setError("Not authenticated with GitHub");
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`/api/auth/github/branches?repo=${encodeURIComponent(repository)}`,
					{
						headers: {
							Authorization: `Bearer ${user.accessToken}`,
						},
					}
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch branches: ${response.statusText}`);
				}

				const data = await response.json();
				const branchList = data.data?.branches || [];

				setBranches(branchList);
				setFilteredBranches(branchList);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch branches");
			} finally {
				setLoading(false);
			}
		},
		[isAuthenticated, user]
	);

	const searchBranches = useCallback(
		(query: string) => {
			if (!query.trim()) {
				setFilteredBranches(branches);
				return;
			}

			const filtered = branches.filter((branch) =>
				branch.name.toLowerCase().includes(query.toLowerCase())
			);
			setFilteredBranches(filtered);
		},
		[branches]
	);

	const groupBranches = useCallback((): BranchGroup => {
		const groups: BranchGroup = {
			main: [],
			feature: [],
			bugfix: [],
			hotfix: [],
			release: [],
			other: [],
		};

		branches.forEach((branch) => {
			const name = branch.name.toLowerCase();
			if (name === "main" || name === "master" || name === "develop") {
				groups.main.push(branch);
			} else if (name.startsWith("feature/")) {
				groups.feature.push(branch);
			} else if (name.startsWith("bugfix/") || name.startsWith("fix/")) {
				groups.bugfix.push(branch);
			} else if (name.startsWith("hotfix/")) {
				groups.hotfix.push(branch);
			} else if (name.startsWith("release/")) {
				groups.release.push(branch);
			} else {
				groups.other.push(branch);
			}
		});

		return groups;
	}, [branches]);

	const clearSearch = useCallback(() => {
		setFilteredBranches(branches);
	}, [branches]);

	return {
		branches,
		filteredBranches,
		loading,
		error,
		fetchBranches,
		searchBranches,
		groupBranches,
		clearSearch,
	};
}
