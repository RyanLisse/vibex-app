"use client";

import { useState, useEffect } from "react";

interface GitHubAuthState {
	isAuthenticated: boolean;
	user: any | null;
	isLoading: boolean;
	error: string | null;
}

export function useGitHubAuth(): GitHubAuthState & {
	login: () => void;
	logout: () => void;
} {
	const [state, setState] = useState<GitHubAuthState>({
		isAuthenticated: false,
		user: null,
		isLoading: true,
		error: null,
	});

	useEffect(() => {
		// Check authentication status on mount
		checkAuthStatus();
	}, []);

	const checkAuthStatus = async () => {
		try {
			setState((prev) => ({ ...prev, isLoading: true }));

			const response = await fetch("/api/auth/github/status");
			if (response.ok) {
				const data = await response.json();
				setState({
					isAuthenticated: data.authenticated,
					user: data.user,
					isLoading: false,
					error: null,
				});
			} else {
				setState({
					isAuthenticated: false,
					user: null,
					isLoading: false,
					error: "Failed to check auth status",
				});
			}
		} catch (error) {
			setState({
				isAuthenticated: false,
				user: null,
				isLoading: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	const login = () => {
		window.location.href = "/api/auth/github/login";
	};

	const logout = async () => {
		try {
			await fetch("/api/auth/github/logout", { method: "POST" });
			setState({
				isAuthenticated: false,
				user: null,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			setState((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : "Logout failed",
			}));
		}
	};

	return {
		...state,
		login,
		logout,
	};
}
