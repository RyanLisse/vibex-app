"use client";

import { useAuthBase } from "./use-auth-base";

/**
 * Anthropic authentication hook
 * Provides authentication functionality for Anthropic/Claude services
 */
export function useAnthropicAuth() {
	const baseAuth = useAuthBase(
		{
			statusEndpoint: "/api/auth/anthropic/status",
			logoutEndpoint: "/api/auth/anthropic/logout",
			authorizeEndpoint: "/api/auth/anthropic/authorize",
		},
		{
			authenticated: false,
			loading: true,
		}
	);

	// Wrap login to handle Anthropic-specific mode parameter
	const login = async (mode = "max") => {
		await baseAuth.login({ mode });
	};

	return {
		...baseAuth,
		login,
		// Anthropic-specific properties
		isClaudeAuthenticated: baseAuth.authenticated,
		claudeUser: baseAuth.user,
	};
}
