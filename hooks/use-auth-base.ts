"use client";

import { useCallback, useEffect, useState } from "react";

export interface AuthConfig {
	statusEndpoint: string;
	loginEndpoint: string;
	logoutEndpoint: string;
	refreshEndpoint?: string;
	authorizeEndpoint?: string;
	provider?: string;
}

export interface AuthState {
	authenticated: boolean;
	loading: boolean;
	error?: string;
	user?: any;
	token?: string;
}

export interface AuthActions {
	login: (params?: any) => Promise<void>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
	checkAuth: () => Promise<void>;
	clearError: () => void;
}

export interface UseAuthBaseReturn extends AuthState, AuthActions {}

/**
 * Base authentication hook that provides common auth functionality
 * Used by specific auth implementations (GitHub, OpenAI, Anthropic)
 */
export function useAuthBase(
	config: AuthConfig,
	initialState?: Partial<AuthState>
): UseAuthBaseReturn {
	const [state, setState] = useState<AuthState>({
		authenticated: false,
		loading: true,
		error: undefined,
		user: null,
		token: undefined,
		...initialState,
	});

	// Clear error state
	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: undefined }));
	}, []);

	// Check authentication status
	const checkAuth = useCallback(async () => {
		try {
			setState((prev) => ({ ...prev, loading: true, error: undefined }));

			const response = await fetch(config.statusEndpoint);

			if (response.ok) {
				const data = await response.json();
				setState((prev) => ({
					...prev,
					authenticated: data.authenticated || false,
					user: data.user || null,
					token: data.token || undefined,
					loading: false,
				}));
			} else {
				setState((prev) => ({
					...prev,
					authenticated: false,
					user: null,
					token: undefined,
					loading: false,
					error: "Failed to check auth status",
				}));
			}
		} catch (error) {
			setState((prev) => ({
				...prev,
				authenticated: false,
				user: null,
				token: undefined,
				loading: false,
				error: error instanceof Error ? error.message : "Authentication check failed",
			}));
		}
	}, [config.statusEndpoint]);

	// Login function
	const login = useCallback(
		async (params?: any) => {
			try {
				setState((prev) => ({ ...prev, loading: true, error: undefined }));

				// If no login endpoint but authorize endpoint exists, redirect to it
				if (!config.loginEndpoint && config.authorizeEndpoint) {
					let url = config.authorizeEndpoint;
					if (params) {
						const searchParams = new URLSearchParams();
						Object.entries(params).forEach(([key, value]) => {
							searchParams.set(key, String(value));
						});
						url += `?${searchParams.toString()}`;
					}
					window.location.href = url;
					return;
				}

				// Make a POST request to login endpoint
				const response = await fetch(config.loginEndpoint, {
					method: "POST",
				});

				if (response.ok) {
					const data = await response.json();
					setState((prev) => ({
						...prev,
						authenticated: data.authenticated || true,
						user: data.user || null,
						token: data.token || undefined,
						loading: false,
					}));
					// Verify auth status after successful login
					await checkAuth();
				} else {
					const errorData = await response.json().catch(() => ({}));
					setState((prev) => ({
						...prev,
						loading: false,
						error: errorData.message || "Login failed",
					}));
				}
			} catch (error) {
				setState((prev) => ({
					...prev,
					loading: false,
					error: error instanceof Error ? error.message : "Login failed",
				}));
			}
		},
		[config.loginEndpoint, config.authorizeEndpoint]
	);

	// Logout function
	const logout = useCallback(async () => {
		try {
			setState((prev) => ({ ...prev, loading: true, error: undefined }));

			const response = await fetch(config.logoutEndpoint, {
				method: "POST",
			});

			if (response.ok) {
				// Clear local state on successful logout
				setState((prev) => ({
					...prev,
					authenticated: false,
					user: null,
					token: undefined,
					loading: false,
				}));
			} else {
				// Keep user authenticated but show error on failed logout
				setState((prev) => ({
					...prev,
					loading: false,
					error: "Failed to logout",
				}));
			}
		} catch (error) {
			// Keep user authenticated but show error on network failure
			setState((prev) => ({
				...prev,
				loading: false,
				error: error instanceof Error ? error.message : "Logout failed",
			}));
		}
	}, [config.logoutEndpoint]);

	// Refresh token function
	const refresh = useCallback(async () => {
		if (!config.refreshEndpoint) {
			console.warn("No refresh endpoint configured");
			return;
		}

		try {
			setState((prev) => ({ ...prev, loading: true, error: undefined }));

			const response = await fetch(config.refreshEndpoint, {
				method: "POST",
			});

			if (response.ok) {
				const data = await response.json();
				setState((prev) => ({
					...prev,
					authenticated: data.authenticated || true,
					user: data.user || prev.user,
					token: data.token || prev.token,
					loading: false,
				}));
			} else {
				setState((prev) => ({
					...prev,
					authenticated: false,
					user: null,
					token: undefined,
					loading: false,
				}));
			}
		} catch (error) {
			setState((prev) => ({
				...prev,
				authenticated: false,
				user: null,
				token: undefined,
				loading: false,
				error: error instanceof Error ? error.message : "Token refresh failed",
			}));
		}
	}, [config.refreshEndpoint]);

	// Check auth status on mount
	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	return {
		...state,
		login,
		logout,
		refresh,
		checkAuth,
		clearError,
	};
}
